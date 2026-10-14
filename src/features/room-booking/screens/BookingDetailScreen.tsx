import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, RefreshControl, View } from 'react-native';

import { roomApi } from '@/core/api/clients';
import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useRoomMe } from '@/core/session/useMe';
import { roomPerson, sameId } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { addDays, atMinutes, formatDayMonth, formatMinutes, formatTime, minutesOfDay, toDateKey, weekdayOf } from '@/core/time/vn';
import { approvalsApi } from '@/features/approval/api/approval.api';
import { ApproveSheet } from '@/features/approval/components/ApproveSheet';
import { useNow } from '@/shared/hooks/useNow';
import { downloadAndShare } from '@/shared/lib/download';
import { AvatarStack } from '@/shared/ui/Avatar';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card, FloatingCard, PressableCard } from '@/shared/ui/Card';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { Icon } from '@/shared/ui/Icon';
import {
  type AppIcon,
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CoffeeIcon,
  DoorOpenIcon,
  EllipsisIcon,
  FileTextIcon,
  LinkIcon,
  PhoneIcon,
  SquareIcon,
  UserIcon,
  UsersIcon,
  XIcon,
  PresentationIcon,
} from '@/shared/ui/icons';
import { InfoRow } from '@/shared/ui/InfoRow';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { NoteField } from '@/shared/ui/NoteField';
import { PersonRow } from '@/shared/ui/PersonRow';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { SelectSheet } from '@/shared/ui/SelectSheet';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/StateViews';
import { BookingBadge, Tag } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { bookingsApi } from '../api/booking.api';
import { ApprovalStepper, levelProgress } from '../components/ApprovalStepper';
import { ExtendCard, LiveHeader } from '../components/LiveMeeting';
import { useBooking } from '../hooks/useBooking';
import { useBookingApprovals } from '../hooks/useBookingApprovals';
import { useGroupSessions } from '../hooks/useGroupSessions';
import { useRoomSteps } from '../hooks/useRoomSteps';
import { useSchedule } from '../hooks/useSchedule';
import { draftFromBooking, inferRecurrence, useBookingDraft } from '../store/draftStore';
import { AttachmentType, BookingStatus, type BookingAttachment, type ParticipantDto } from '../types';
import { allExtendDeltas, bookingFrom, bookingPermissions, bookingPhase, bookingTo, buildApprovalSteps, EXTEND_STEPS, extendOptions, freeUntil, isInExtendWindow } from '../utils/booking';
import { serviceIcon } from '../utils/serviceIcon';

type MoreAction = { label: string; destructive?: boolean; onPress: () => void };

/** Chi tiết cuộc họp: 6b (waiting) and 6c (approved, in progress) share one layout; actions follow CLAUDE.md §3.4. */
export function BookingDetailScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
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
  const [sheet, setSheet] = useState<'people' | 'documents' | 'services' | 'extend' | null>(null);
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

  const header = (content: ReactNode, right?: ReactNode, bottom = 44) => (
    <ModuleHeader testID="meeting-header" icon={PresentationIcon} title={t('meeting.title')} subtitle={b?.code ?? undefined} subtitleMono right={right} bottom={bottom}>
      {content}
    </ModuleHeader>
  );

  if (booking.isLoading || !b || !perms) {
    return (
      <ModuleScreen header={header(null, undefined, 24)}>
        {booking.isError ? <ErrorState error={booking.error} onRetry={() => void booking.refetch()} /> : <ListSkeleton count={3} />}
      </ModuleScreen>
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
  const options = perms.canExtend ? extendOptions(b, b.room, daySchedule.data ?? [], EXTEND_STEPS) : [];
  const allOptions = perms.canExtend ? extendOptions(b, b.room, daySchedule.data ?? [], allExtendDeltas(b, b.room)) : [];
  const extendTo = extendChoice !== undefined && allOptions.some((o) => o.minutes === extendChoice && !o.taken) ? extendChoice : options.find((o) => !o.taken)?.minutes;
  const roomFreeUntil = perms.canExtend ? freeUntil(b, b.room, daySchedule.data ?? []) : null;

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
    // Approve is the main decision: wider and filled; reject stays a quieter tinted button beside it.
    actions.push(<Button key="reject" testID="meeting-reject" className="flex-1" variant="danger-soft" icon={XIcon} label={t('approvals.reject')} onPress={() => setApproving(true)} />);
    actions.push(<Button key="approve" testID="meeting-approve" className="flex-[1.6]" variant="success" icon={CheckIcon} label={t('approvals.approve')} onPress={() => setApproving(true)} />);
  } else if (showCountdown && (perms.canEndEarly || (perms.canExtend && extendTo !== undefined))) {
    if (perms.canEndEarly) actions.push(<Button key="end" testID="meeting-end-now" className="flex-1" variant="ghost" icon={SquareIcon} label={t('meeting.endEarly')} loading={complete.isPending} onPress={onEndNow} />);
    if (perms.canExtend && extendTo !== undefined) {
      actions.push(
        <Button
          key="extend"
          testID="meeting-extend"
          className="flex-[1.4]"
          label={t('meeting.extendButton', { time: formatMinutes(extendTo) })}
          loading={extend.isPending}
          onPress={() => extend.mutate(extendTo)}
        />,
      );
    }
    if (perms.canCancel) more.push({ label: t('meeting.cancel'), destructive: true, onPress: () => setCancelling(true) });
  } else {
    if (perms.canCancel) actions.push(<Button key="cancel" testID="meeting-cancel" className="flex-1" variant="danger-outline" label={t('meeting.cancel')} onPress={() => setCancelling(true)} />);
    if (perms.canEdit) actions.push(<Button key="edit" testID="meeting-edit" className="flex-[1.4]" label={t('meeting.edit')} onPress={onEdit} />);
    if (perms.canUndo && actions.length < 2) {
      actions.push(<Button key="undo" testID="meeting-undo" className="flex-1" variant="ghost" label={t('approvals.undo')} loading={undo.isPending} onPress={onUndo} />);
    } else if (perms.canUndo) {
      more.push({ label: t('approvals.undo'), onPress: onUndo });
    }
  }

  const moreButton = more.length ? (
    <HeaderIconButton
      testID="meeting-more"
      icon={EllipsisIcon}
      label={t('common.more')}
      onPress={() =>
        Alert.alert(b.code ?? t('meeting.title'), undefined, [
          ...more.map((m) => ({ text: m.label, style: m.destructive ? ('destructive' as const) : ('default' as const), onPress: m.onPress })),
          { text: t('common.cancel'), style: 'cancel' as const },
        ])
      }
    />
  ) : undefined;

  const title = perms.canSeeContent ? b.content || b.code || '' : t('meeting.confidentialHidden');
  const host = participants.find((p) => p.isHost);
  const sessionLabel = series && sessionIndex >= 0 ? t('meeting.sessionOf', { index: sessionIndex + 1, total: group.sessions.length }) : null;
  const approvedLevels = new Set(stepViews.filter((s) => s.state === 'approved').map((s) => s.order)).size;
  // The pending level started with the last decision (or with the request itself).
  const waitingSince = rows.filter((r) => r.processedAt).map((r) => r.processedAt!).sort().pop() ?? b.createdAt;

  const summary = (
    <FloatingCard radius={20} className="gap-2.5 p-4">
      <View className="flex-row flex-wrap items-center gap-1.5">
        <BookingBadge status={status} dot />
        {status === BookingStatus.Approved && phase !== 'live' ? <Tag label={t(`status.bookingPhase.${phase}`)} /> : null}
        {sessionLabel ? <Tag label={sessionLabel} /> : null}
        {recurrence?.recurrence === 'weekly' ? <Tag label={t('meeting.recurrenceWeekly')} /> : recurrence?.recurrence === 'daily' ? <Tag label={t('meeting.recurrenceDaily')} /> : null}
      </View>
      <Text weight="bold" numberOfLines={3} accessibilityRole="header" className="text-ink" style={{ fontSize: 18, lineHeight: 24 }}>
        {title}
      </Text>
      <View className="gap-1.5">
        <SummaryRow icon={ClockIcon}>
          <Text mono weight="bold" className="text-ink" style={{ fontSize: 13.5 }}>{`${formatTime(from)} - ${formatTime(to)}`}</Text>
          {from ? ` · ${t(`time.weekday.${String(weekdayOf(toDateKey(from))) as '0'}`)}, ${formatDayMonth(from)}` : ''}
        </SummaryRow>
        <SummaryRow icon={DoorOpenIcon}>{[b.room?.name, b.room?.code2, t('meeting.people', { count: b.numberOfParticipants ?? 0 })].filter(Boolean).join(' · ')}</SummaryRow>
        {b.user ? <SummaryRow icon={UserIcon}>{t('meeting.registeredBy', { name: b.user.fullname ?? b.user.username })}</SummaryRow> : null}
      </View>
    </FloatingCard>
  );

  const participantRows = participants.map((p) => (
    <PersonRow
      key={p.id}
      person={roomPerson(p.user)}
      trailing={p.isHost ? <Tag kind="wait" label={t('booking.host')} /> : p.isPrepareContent ? <Tag kind="warn" label={t('booking.prepare')} /> : undefined}
    />
  ));

  const documents = b.attachments ?? [];

  return (
    <ModuleScreen
      header={
        showCountdown
          ? header(<LiveHeader booking={b} title={title} roomLine={[b.room?.name, b.room?.code2].filter(Boolean).join(' · ')} people={t('meeting.people', { count: b.numberOfParticipants ?? 0 })} />, moreButton, 24)
          : header(null, moreButton, 18)
      }
      floating={showCountdown ? undefined : summary}
      floatingScrolls
      footer={actions.length ? actions : undefined}
      refreshControl={<RefreshControl refreshing={booking.isRefetching} onRefresh={() => void Promise.all([booking.refetch(), approvals.refetch()])} />}
    >
      {showCountdown && perms.canExtend && to ? (
        <ExtendCard
          options={options}
          endMin={minutesOfDay(to)}
          value={extendTo}
          onChange={setExtendChoice}
          onOther={() => setSheet('extend')}
          roomName={b.room?.name ?? ''}
          freeUntil={roomFreeUntil}
        />
      ) : null}

      {perms.cancelBlockedByPolicy ? (
        <Banner tone="off" testID="meeting-no-cancel">
          {t('meeting.noCancelPolicy')}
        </Banner>
      ) : null}
      {status === BookingStatus.Rejected && rejectedRow?.comment ? <Banner tone="danger">{t('meeting.rejectedReason', { reason: rejectedRow.comment })}</Banner> : null}
      {status === BookingStatus.Canceled && b.reason ? <Banner tone="off">{t('meeting.cancelledReason', { reason: b.reason })}</Banner> : null}

      {!showCountdown ? (
        <Card className="gap-3.5 p-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text weight="bold" accessibilityRole="header" style={{ fontSize: 15, lineHeight: 20 }}>
              {t('meeting.approvalHistory')}
            </Text>
            {progress ? (
              <View className="flex-row items-center gap-2">
                <View className="w-11">
                  <ProgressBar value={approvedLevels / progress.total} color={colors.success} height={5} />
                </View>
                <Text mono weight="bold" className="text-ink-2" style={{ fontSize: 12, lineHeight: 16 }}>
                  {`${approvedLevels}/${progress.total}`}
                </Text>
              </View>
            ) : null}
          </View>
          {stepViews.length ? <ApprovalStepper steps={stepViews} waitingSince={waitingSince} /> : <Text className="text-sub text-muted">{t('meeting.noWorkflow')}</Text>}
        </Card>
      ) : null}

      {showCountdown ? (
        <>
          {participants.length ? (
            <PressableCard testID="meeting-participants" onPress={() => setSheet('people')} className="flex-row items-center gap-3 p-4">
              <AvatarStack size={34} max={4} people={participants.map((p) => ({ name: p.user.fullname, uri: p.user.avatarUrl }))} />
              <View className="min-w-0 flex-1">
                <Text weight="bold" numberOfLines={1} style={{ fontSize: 14.5, lineHeight: 19 }}>
                  {t('meeting.participantsLine', { count: participants.length })}
                </Text>
                {host ? (
                  <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
                    {t('meeting.hostLine', { name: host.user.fullname ?? '' })}
                  </Text>
                ) : null}
              </View>
              <Icon icon={ChevronRightIcon} size={16} color="subtle" />
            </PressableCard>
          ) : null}
          {documents.length ? (
            <Card className="gap-1 px-4 pb-2 pt-3.5">
              <Text weight="bold" accessibilityRole="header" className="pb-1" style={{ fontSize: 15, lineHeight: 20 }}>
                {`${t('meeting.documents')} · ${documents.length}`}
              </Text>
              {documents.map((a, i) => (
                <DocumentLine key={a.id} attachment={a} divider={i > 0} onOpen={() => void openAttachment(a)} />
              ))}
            </Card>
          ) : null}
          {b.services?.length ? (
            <Card>
              <InfoRow icon={CoffeeIcon} label={t('meeting.services')} value={b.services.map((s) => s.name).join(', ')} />
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <InfoRow
            testID="meeting-participants"
            icon={UsersIcon}
            label={t('meeting.participants')}
            value={participants.length ? t('meeting.participantsCount', { count: participants.length }) : t('meeting.none')}
            onPress={participants.length ? () => setSheet('people') : undefined}
          />
          {b.participant ? <InfoRow divider icon={UsersIcon} label={t('meeting.otherParticipants')} value={b.participant} /> : null}
          <InfoRow
            divider
            icon={BellIcon}
            label={t('meeting.services')}
            value={b.services?.length ? t('meeting.servicesCount', { count: b.services.length }) : t('meeting.none')}
            onPress={b.services?.length ? () => setSheet('services') : undefined}
          />
          <InfoRow
            divider
            testID="meeting-documents"
            icon={FileTextIcon}
            label={t('meeting.documents')}
            value={documents.length ? t('meeting.filesCount', { count: documents.length }) : t('meeting.none')}
            onPress={documents.length ? () => setSheet('documents') : undefined}
          />
          {b.phoneNumber ? <InfoRow divider icon={PhoneIcon} label={t('meeting.phone')} value={b.phoneNumber} mono onPress={() => void Linking.openURL(`tel:${b.phoneNumber}`)} /> : null}
        </Card>
      )}

      <ApproveSheet bookingId={approving ? b.id : null} onClose={() => setApproving(false)} onDone={refresh} />

      <BottomSheet visible={sheet === 'people'} onClose={() => setSheet(null)} title={`${t('meeting.participants')} · ${participants.length}`} scrollable>
        {participantRows}
      </BottomSheet>
      <BottomSheet visible={sheet === 'services'} onClose={() => setSheet(null)} title={t('meeting.services')} scrollable>
        {(b.services ?? []).map((service) => (
          <InfoRow key={service.id} icon={serviceIcon(service.name)} label={service.name} />
        ))}
      </BottomSheet>
      <BottomSheet visible={sheet === 'documents'} onClose={() => setSheet(null)} title={t('meeting.documents')} scrollable>
        {documents.map((a, i) => (
          <DocumentLine key={a.id} attachment={a} divider={i > 0} onOpen={() => void openAttachment(a)} />
        ))}
      </BottomSheet>
      <SelectSheet
        visible={sheet === 'extend'}
        onClose={() => setSheet(null)}
        title={t('meeting.extendTo')}
        value={extendTo}
        options={allOptions.filter((o) => !o.taken).map((o) => ({ value: o.minutes, label: formatMinutes(o.minutes) }))}
        mono
        onSelect={(minutes) => setExtendChoice(minutes)}
      />

      <BottomSheet
        visible={cancelling}
        onClose={() => setCancelling(false)}
        icon={XIcon}
        iconTone="danger"
        title={t('meeting.cancelTitle')}
        caption={b.code ?? undefined}
        footer={<Button testID="meeting-cancel-confirm" variant="danger-outline" label={t('meeting.cancelConfirm')} loading={cancel.isPending} onPress={() => cancel.mutate()} />}
      >
        <Text weight="semibold" className="text-muted" style={{ fontSize: 13, lineHeight: 17 }}>
          {t('meeting.cancelReason')}
        </Text>
        <NoteField testID="meeting-cancel-reason" placeholder={t('meeting.cancelReasonPlaceholder')} value={reason} onChangeText={setReason} />
      </BottomSheet>
    </ModuleScreen>
  );
}

function SummaryRow({ icon, children }: { icon: AppIcon; children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon icon={icon} size={15} color="muted" />
      <Text numberOfLines={1} className="flex-shrink text-ink-2" style={{ fontSize: 13.5, lineHeight: 18 }}>
        {children}
      </Text>
    </View>
  );
}

/** Document line (6c): file / link icon box, name, type · host, "Mở". */
function DocumentLine({ attachment: a, divider, onOpen }: { attachment: BookingAttachment; divider?: boolean; onOpen: () => void }) {
  const { t } = useTranslation();
  const link = a.type === AttachmentType.Link;
  const name = a.name ?? '';
  const meta = link ? (a.path ?? name).replace(/^https?:\/\/(www\.)?/i, '').split('/')[0] : (name.split('.').pop() ?? '').toUpperCase();
  return (
    <View className={`min-h-[56px] flex-row items-center gap-3 py-2 ${divider ? 'border-t border-line-2' : ''}`}>
      <View className={`h-10 w-10 items-center justify-center rounded-[11px] ${link ? 'bg-primary-tint' : 'bg-danger-tint'}`}>
        <Icon icon={link ? LinkIcon : FileTextIcon} size={18} color={link ? 'primary' : 'danger'} />
      </View>
      <View className="min-w-0 flex-1">
        <Text weight="bold" numberOfLines={1} style={{ fontSize: 14, lineHeight: 19 }}>
          {link ? name.replace(/^https?:\/\/(www\.)?/i, '') : name}
        </Text>
        <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
          {meta}
        </Text>
      </View>
      <Button size="xs" variant="soft" label={t('meeting.open')} onPress={onOpen} className="rounded-[10px] px-3.5" />
    </View>
  );
}
