import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, RefreshControl, View } from 'react-native';

import { roomApi } from '@/core/api/clients';
import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useRoomMe } from '@/core/session/useMe';
import { roomPerson, sameId } from '@/core/session/userTypes';
import { addDays, atMinutes, formatDate, formatMinutes, formatTime, toDateKey, weekdayOf } from '@/core/time/vn';
import { ApproveSheet } from '@/features/approval/ApproveSheet';
import { approvalsApi } from '@/features/approval/api';
import { downloadAndShare } from '@/shared/lib/download';
import { useNow } from '@/shared/hooks/useNow';
import { Avatar, AvatarStack } from '@/shared/ui/Avatar';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { HeaderBar, HeaderIconButton } from '@/shared/ui/HeaderBar';
import { HeaderPill, useHeaderDot } from '@/shared/ui/HeaderPill';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, ClockIcon, CoffeeIcon, DoorOpenIcon, DotsThreeIcon, PaperclipIcon, PencilSimpleIcon, PhoneIcon, UserIcon, UsersIcon, XIcon } from '@/shared/ui/icons';
import { InfoRow } from '@/shared/ui/InfoRow';
import { NoteField } from '@/shared/ui/NoteField';
import { PersonRow } from '@/shared/ui/PersonRow';
import { ScreenShell, useHeaderColors } from '@/shared/ui/ScreenShell';
import { SectionTitle } from '@/shared/ui/SectionTitle';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/StateViews';
import { bookingBadgeKind } from '@/shared/ui/status';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { bookingsApi } from './api';
import { ApprovalStepper, levelProgress } from './components/ApprovalStepper';
import { DocumentRow } from './components/DocumentRow';
import { CountdownPanel, ExtendCard } from './components/LiveMeeting';
import { draftFromBooking, inferRecurrence, useBookingDraft } from './draftStore';
import { useBooking, useBookingApprovals, useGroupSessions, useRoomSteps, useSchedule } from './hooks';
import { bookingFrom, bookingPermissions, bookingPhase, bookingTo, buildApprovalSteps, extendOptions, isInExtendWindow } from './logic';
import { AttachmentType, BookingStatus, type BookingAttachment, type ParticipantDto } from './types';

type MoreAction = { label: string; destructive?: boolean; onPress: () => void };

/** Chi tiết cuộc họp: 6b (waiting) and 6c (approved, in progress) share one layout; actions follow CLAUDE.md §3.4. */
export function BookingDetailScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { fg, sub, muted } = useHeaderColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useBooking(id);
  const approvals = useBookingApprovals(id);
  const me = useRoomMe();
  const b = booking.data;
  const steps = useRoomSteps(b?.roomId ?? b?.room?.id);
  const group = useGroupSessions(b);
  const now = useNow(30_000);
  const startDraft = useBookingDraft((s) => s.start);
  const [approving, setApproving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [sheet, setSheet] = useState<'people' | 'documents' | null>(null);
  const [extendChoice, setExtendChoice] = useState<number | undefined>();

  const from = b ? bookingFrom(b) : null;
  const to = b ? bookingTo(b) : null;
  const dayKey = from ? toDateKey(from) : undefined;
  const rows = approvals.data ?? [];
  const perms = b ? bookingPermissions(b, me.data?.id, rows, now) : null;
  const daySchedule = useSchedule(
    { fromDate: dayKey ? atMinutes(dayKey, 0).toISOString() : '', toDate: dayKey ? atMinutes(addDays(dayKey, 1), 0).toISOString() : '', areaId: b?.room?.areaId ?? undefined },
    !!perms?.canExtend,
  );

  const status = b?.status ?? BookingStatus.Waiting;
  const phase = b ? bookingPhase(b, now) : 'upcoming';
  const live = status === BookingStatus.Approved && phase === 'live';
  const statusDot = useHeaderDot(live ? 'live' : bookingBadgeKind(status));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: qk.bookings.root });
    void queryClient.invalidateQueries({ queryKey: qk.approvals.root });
  };
  const onError = (e: unknown) => toast.error(errorMessage(e, t));

  const cancel = useMutation({
    mutationFn: () => bookingsApi.cancel(id, reason.trim()),
    onSuccess: () => {
      toast.success(t('meeting.cancelled'));
      setCancelling(false);
      refresh();
    },
    onError,
  });
  const extend = useMutation({
    mutationFn: (minutes: number) => bookingsApi.extend(id, atMinutes(dayKey!, minutes).toISOString()),
    onSuccess: (_, minutes) => {
      toast.success(t('meeting.extended', { time: formatMinutes(minutes) }));
      setExtendChoice(undefined);
      refresh();
    },
    onError,
  });
  const complete = useMutation({
    mutationFn: () => bookingsApi.complete(id, new Date().toISOString()),
    onSuccess: () => {
      toast.success(t('meeting.ended'));
      refresh();
    },
    onError,
  });
  const undo = useMutation({
    mutationFn: (isUpdateSingleDay: boolean) => approvalsApi.undo(id, isUpdateSingleDay),
    onSuccess: () => {
      toast.success(t('approvals.undone'));
      refresh();
    },
    onError,
  });

  const header = (content: ReactNode, right?: ReactNode) => (
    <>
      <HeaderBar testID="meeting-header" title={t('meeting.title')} right={right} />
      {content}
    </>
  );

  if (booking.isLoading || !b || !perms) {
    return (
      <ScreenShell header={header(null)}>
        {booking.isError ? <ErrorState error={booking.error} onRetry={() => void booking.refetch()} /> : <ListSkeleton count={3} />}
      </ScreenShell>
    );
  }

  const series = b.isSingleBooking === false;
  const sessionIndex = group.sessions.findIndex((s) => sameId(s.id, b.id));
  const recurrence = series ? inferRecurrence(group.sessions.map((s) => toDateKey(bookingFrom(s) ?? new Date()))) : null;
  const stepViews = buildApprovalSteps(rows, steps, status);
  const progress = levelProgress(stepViews);
  const rejectedRow = rows.find((r) => r.isApproved === false);
  const participants = (b.participants ?? []).filter((p): p is ParticipantDto & { user: NonNullable<ParticipantDto['user']> } => !!p.user);
  const showCountdown = status === BookingStatus.Approved && perms.isCreator && (perms.canExtend || perms.canEndEarly || isInExtendWindow(b, now));
  const options = perms.canExtend ? extendOptions(b, b.room, daySchedule.data ?? []) : [];
  const extendTo = extendChoice !== undefined && options.some((o) => o.minutes === extendChoice && !o.taken) ? extendChoice : options.find((o) => !o.taken)?.minutes;
  const roomLine = [b.room?.name, b.room?.code2, live ? (b.room?.numberOfSeats ? t('rooms.seats', { seats: b.room.numberOfSeats }) : null) : t('meeting.people', { count: b.numberOfParticipants ?? 0 })]
    .filter(Boolean)
    .join(' · ');

  const confirmScope = (title: string, message: string, run: (single: boolean) => void) => {
    if (!series) return run(true);
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('meeting.thisSession'), onPress: () => run(true) },
      { text: t('meeting.wholeSeries'), onPress: () => run(false) },
    ]);
  };

  const onEdit = () =>
    confirmScope(t('meeting.editScopeTitle'), t('meeting.editScopeMessage'), (single) => {
      startDraft(draftFromBooking(b, single ? 'single' : 'series', group.sessions));
      router.push('/rooms/book');
    });

  const onUndo = () =>
    series
      ? confirmScope(t('approvals.undo'), t('approvals.undoConfirm'), (single) => undo.mutate(single))
      : Alert.alert(t('approvals.undo'), t('approvals.undoConfirm'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('approvals.undo'), onPress: () => undo.mutate(true) },
        ]);

  const onEndNow = () =>
    Alert.alert(t('meeting.endNow'), t('meeting.endNowConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('meeting.endNow'), style: 'destructive', onPress: () => complete.mutate() },
    ]);

  const openAttachment = async (a: BookingAttachment) => {
    try {
      if (a.type === AttachmentType.Link) await Linking.openURL(a.path ?? a.name ?? '');
      else await downloadAndShare(bookingsApi.attachmentDownloadUrl(b.id, a.id), a.name ?? 'tai-lieu', roomApi.authHeaders());
    } catch {
      toast.error(t('meeting.downloadFailed'));
    }
  };

  // Footer per the action matrix; anything that does not fit goes to the "…" menu.
  const actions: ReactNode[] = [];
  const more: MoreAction[] = [];
  if (perms.pendingRow) {
    actions.push(<Button key="reject" testID="meeting-reject" className="flex-1" variant="danger" icon={XIcon} label={t('approvals.reject')} onPress={() => setApproving(true)} />);
    actions.push(<Button key="approve" testID="meeting-approve" className="flex-1" variant="success" icon={CheckIcon} label={t('approvals.approve')} onPress={() => setApproving(true)} />);
  } else if (showCountdown && (perms.canEndEarly || (perms.canExtend && extendTo !== undefined))) {
    if (perms.canEndEarly) actions.push(<Button key="end" testID="meeting-end-now" className="flex-1" variant="ghost" label={t('meeting.endEarly')} loading={complete.isPending} onPress={onEndNow} />);
    if (perms.canExtend && extendTo !== undefined) {
      actions.push(
        <Button
          key="extend"
          testID="meeting-extend"
          className="flex-1"
          label={t('meeting.extendShort', { time: formatMinutes(extendTo) })}
          loading={extend.isPending}
          onPress={() => extend.mutate(extendTo)}
        />,
      );
    }
    if (perms.canCancel) more.push({ label: t('meeting.cancel'), destructive: true, onPress: () => setCancelling(true) });
  } else {
    if (perms.canCancel) actions.push(<Button key="cancel" testID="meeting-cancel" className="flex-1" variant="danger" label={t('meeting.cancel')} onPress={() => setCancelling(true)} />);
    if (perms.canEdit) actions.push(<Button key="edit" testID="meeting-edit" className="flex-1" icon={PencilSimpleIcon} label={t('meeting.edit')} onPress={onEdit} />);
    if (perms.canUndo && actions.length < 2) {
      actions.push(<Button key="undo" testID="meeting-undo" className="flex-1" variant="ghost" label={t('approvals.undo')} loading={undo.isPending} onPress={onUndo} />);
    } else if (perms.canUndo) {
      more.push({ label: t('approvals.undo'), onPress: onUndo });
    }
  }

  const moreButton = more.length ? (
    <HeaderIconButton
      testID="meeting-more"
      icon={DotsThreeIcon}
      label={t('common.more')}
      onPress={() =>
        Alert.alert(b.code ?? t('meeting.title'), undefined, [
          ...more.map((m) => ({ text: m.label, style: m.destructive ? ('destructive' as const) : ('default' as const), onPress: m.onPress })),
          { text: t('common.cancel'), style: 'cancel' as const },
        ])
      }
    />
  ) : undefined;

  const pills = (
    <View className="flex-row items-center gap-1.5">
      {live ? (
        <>
          <HeaderPill testID="meeting-status" label={t('status.bookingPhase.live')} dotColor={statusDot} />
          <HeaderPill label={t('status.booking.2')} />
        </>
      ) : (
        <>
          <HeaderPill testID="meeting-status" label={t(`status.booking.${String(status) as '1'}`)} dotColor={statusDot} />
          {status === BookingStatus.Approved ? <HeaderPill label={t(`status.bookingPhase.${phase}`)} /> : null}
        </>
      )}
      {series && sessionIndex >= 0 ? (
        <HeaderPill
          label={[
            t('meeting.sessionOf', { index: sessionIndex + 1, total: group.sessions.length }),
            recurrence?.recurrence === 'weekly' ? t('meeting.recurrenceWeekly') : recurrence?.recurrence === 'daily' ? t('meeting.recurrenceDaily') : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      ) : null}
      {b.code ? (
        <Text mono numberOfLines={1} className="ml-auto flex-shrink pl-1" style={{ fontSize: 11.5, lineHeight: 15, color: muted }}>
          {b.code}
        </Text>
      ) : null}
    </View>
  );

  const headerContent = (
    <>
      <View className="gap-2.5 px-3 pt-2">
        {pills}
        <Text weight="bold" numberOfLines={3} accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, color: fg }}>
          {perms.canSeeContent ? b.content || b.code : t('meeting.confidentialHidden')}
        </Text>
        {!showCountdown ? (
          <View className="flex-row items-center gap-2">
            <Icon icon={ClockIcon} size={15} rawColor={sub} />
            <Text numberOfLines={1} className="flex-shrink" style={{ fontSize: 13.5, lineHeight: 18, color: sub }}>
              <Text mono weight="semibold" style={{ fontSize: 13.5, color: fg }}>{`${formatTime(from)} – ${formatTime(to)}`}</Text>
              {from ? ` · ${t(`time.weekdayShort.${String(weekdayOf(toDateKey(from))) as '0'}`)}, ${formatDate(from)}` : ''}
            </Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-2">
          <Icon icon={DoorOpenIcon} size={15} rawColor={sub} />
          <Text numberOfLines={1} className="flex-shrink" style={{ fontSize: 13.5, lineHeight: 18, color: sub }}>
            {roomLine}
          </Text>
        </View>
      </View>
      {showCountdown ? <CountdownPanel booking={b} /> : null}
    </>
  );

  const participantRows = participants.map((p) => (
    <PersonRow
      key={p.id}
      person={roomPerson(p.user)}
      trailing={
        p.isHost ? <StatusBadge kind="wait" label={t('booking.host')} /> : p.isPrepareContent ? <StatusBadge kind="off" label={t('booking.prepare')} /> : undefined
      }
    />
  ));

  return (
    <ScreenShell
      header={header(headerContent, moreButton)}
      footer={actions.length ? actions : undefined}
      refreshControl={<RefreshControl refreshing={booking.isRefetching} onRefresh={() => void Promise.all([booking.refetch(), approvals.refetch()])} />}
    >
      {showCountdown && perms.canExtend ? <ExtendCard options={options} value={extendTo} onChange={setExtendChoice} /> : null}

      {perms.cancelBlockedByPolicy ? (
        <Banner tone="off" testID="meeting-no-cancel">
          {t('meeting.noCancelPolicy')}
        </Banner>
      ) : null}
      {status === BookingStatus.Rejected && rejectedRow?.comment ? <Banner tone="danger">{t('meeting.rejectedReason', { reason: rejectedRow.comment })}</Banner> : null}
      {status === BookingStatus.Canceled && b.reason ? <Banner tone="off">{t('meeting.cancelledReason', { reason: b.reason })}</Banner> : null}

      {!showCountdown ? (
        <Card className="gap-3.5 p-4">
          <SectionTitle right={progress ? t('meeting.levelProgress', progress) : undefined}>{t('meeting.approvalFlow')}</SectionTitle>
          {stepViews.length ? <ApprovalStepper steps={stepViews} /> : <Text className="text-sub text-muted">{t('meeting.noWorkflow')}</Text>}
        </Card>
      ) : null}

      {showCountdown && participants.length ? (
        <Card className="gap-3 px-4 py-3.5">
          <SectionTitle>{`${t('meeting.participants')} · ${participants.length}`}</SectionTitle>
          {participantRows}
        </Card>
      ) : null}

      <Card>
        {b.user ? (
          <InfoRow
            icon={UserIcon}
            label={t('meeting.organizer')}
            value={
              <View className="flex-shrink flex-row items-center gap-2">
                <Avatar name={b.user.fullname} uri={b.user.avatarUrl} size={24} />
                <Text weight="medium" numberOfLines={1} className="flex-shrink" style={{ fontSize: 13.5, lineHeight: 18 }}>
                  {b.user.fullname ?? b.user.username}
                </Text>
              </View>
            }
          />
        ) : null}
        {!showCountdown ? (
          <InfoRow
            divider={!!b.user}
            testID="meeting-participants"
            icon={UsersIcon}
            label={t('meeting.participants')}
            value={participants.length ? <AvatarStack size={24} people={participants.map((p) => ({ name: p.user.fullname, uri: p.user.avatarUrl }))} /> : t('meeting.none')}
            onPress={participants.length ? () => setSheet('people') : undefined}
          />
        ) : null}
        {b.participant ? <InfoRow divider icon={UsersIcon} label={t('meeting.otherParticipants')} value={b.participant} /> : null}
        <InfoRow divider icon={CoffeeIcon} label={t('meeting.services')} value={b.services?.length ? b.services.map((s) => s.name).join(', ') : t('meeting.none')} />
        <InfoRow
          divider
          testID="meeting-documents"
          icon={PaperclipIcon}
          label={t('meeting.documents')}
          value={b.attachments?.length ? t('meeting.documentsCount', { count: b.attachments.length }) : t('meeting.none')}
          onPress={b.attachments?.length ? () => setSheet('documents') : undefined}
        />
        {b.phoneNumber ? <InfoRow divider icon={PhoneIcon} label={t('meeting.phone')} value={b.phoneNumber} mono onPress={() => void Linking.openURL(`tel:${b.phoneNumber}`)} /> : null}
      </Card>

      <ApproveSheet bookingId={approving ? b.id : null} onClose={() => setApproving(false)} onDone={refresh} />

      <BottomSheet visible={sheet === 'people'} onClose={() => setSheet(null)} title={`${t('meeting.participants')} · ${participants.length}`} scrollable>
        {participantRows}
      </BottomSheet>
      <BottomSheet visible={sheet === 'documents'} onClose={() => setSheet(null)} title={t('meeting.documents')} scrollable>
        {(b.attachments ?? []).map((a) => (
          <Pressable key={a.id} accessibilityRole="button" onPress={() => void openAttachment(a)} className="active:opacity-70">
            <DocumentRow name={a.name ?? ''} link={a.type === AttachmentType.Link} />
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={cancelling}
        onClose={() => setCancelling(false)}
        icon={XIcon}
        iconTone="danger"
        title={t('meeting.cancelTitle')}
        caption={b.code ?? undefined}
        footer={<Button testID="meeting-cancel-confirm" variant="danger" label={t('meeting.cancelConfirm')} loading={cancel.isPending} onPress={() => cancel.mutate()} />}
      >
        <Text weight="semibold" className="text-muted" style={{ fontSize: 13, lineHeight: 17 }}>
          {t('meeting.cancelReason')}
        </Text>
        <NoteField testID="meeting-cancel-reason" placeholder={t('meeting.cancelReasonPlaceholder')} value={reason} onChangeText={setReason} />
      </BottomSheet>
    </ScreenShell>
  );
}
