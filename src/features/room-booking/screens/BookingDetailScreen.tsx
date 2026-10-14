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
import { addDays, atMinutes, formatMinutes, minutesOfDay, toDateKey } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { downloadAndShare } from '@/shared/lib/download';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { EllipsisIcon, PresentationIcon, SquareIcon, XIcon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { NoteField } from '@/shared/ui/NoteField';
import { PersonRow } from '@/shared/ui/PersonRow';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { SelectSheet } from '@/shared/ui/SelectSheet';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/StateViews';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';

import { bookingsApi } from '../api/booking.api';
import { ApprovalStepper, levelProgress } from '../components/ApprovalStepper';
import { ExtendCard } from '../components/LiveMeeting';
import { DocumentsCard, ParticipantsCard, PlaceCard, RoleTags, ServicesCard, sortParticipants, type MeetingParticipant } from '../components/MeetingCards';
import { MeetingHero } from '../components/MeetingHero';
import { useBooking } from '../hooks/useBooking';
import { useBookingApprovals } from '../hooks/useBookingApprovals';
import { useGroupSessions } from '../hooks/useGroupSessions';
import { useRoomSteps } from '../hooks/useRoomSteps';
import { useSchedule } from '../hooks/useSchedule';
import { draftFromBooking, inferRecurrence, useBookingDraft } from '../store/draftStore';
import { AttachmentType, BookingStatus, type BookingAttachment } from '../types';
import { allExtendDeltas, bookingFrom, bookingPermissions, bookingTo, buildApprovalSteps, EXTEND_STEPS, extendOptions, freeUntil, isInExtendWindow } from '../utils/booking';

type MoreAction = { label: string; destructive?: boolean; onPress: () => void };

/** Chi tiết cuộc họp: 6b (waiting) and 6c (approved, in progress) share one layout; actions follow CLAUDE.md §3.4. */
export function BookingDetailScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useBooking(id);
  const approvals = useBookingApprovals(id);
  const pull = usePullRefresh(() => Promise.all([booking.refetch(), approvals.refetch()]));
  const me = useRoomMe();
  const b = booking.data;
  const steps = useRoomSteps(b?.roomId ?? b?.room?.id);
  const group = useGroupSessions(b);
  const now = useNow(30_000);
  const startDraft = useBookingDraft((s) => s.start);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [sheet, setSheet] = useState<'people' | 'extend' | null>(null);
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

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: qk.bookings.root });
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
  const participants = (b.participants ?? []).filter((p): p is MeetingParticipant => !!p.user);
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
  if (showCountdown && (perms.canEndEarly || (perms.canExtend && extendTo !== undefined))) {
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
  const sessionLabel = series && sessionIndex >= 0 ? t('meeting.sessionOf', { index: sessionIndex + 1, total: group.sessions.length }) : null;
  const approvedLevels = new Set(stepViews.filter((s) => s.state === 'approved').map((s) => s.order)).size;
  // The pending level started with the last decision (or with the request itself).
  const waitingSince = rows.filter((r) => r.processedAt).map((r) => r.processedAt!).sort().pop() ?? b.createdAt;

  const tags: string[] = [];
  if (sessionLabel) tags.push(sessionLabel);
  if (recurrence?.recurrence === 'weekly') tags.push(t('meeting.recurrenceWeekly'));
  else if (recurrence?.recurrence === 'daily') tags.push(t('meeting.recurrenceDaily'));
  const documents = b.attachments ?? [];

  return (
    <ModuleScreen
      header={header(<MeetingHero booking={b} title={title} hidden={!perms.canSeeContent} tags={tags} />, moreButton, 18)}
      floating={<PlaceCard booking={b} />}
      floatingScrolls
      footer={actions.length ? actions : undefined}
      refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={() => void pull.onRefresh()} />}
    >
      {perms.cancelBlockedByPolicy ? (
        <Banner tone="off" testID="meeting-no-cancel">
          {t('meeting.noCancelPolicy')}
        </Banner>
      ) : null}
      {status === BookingStatus.Rejected && rejectedRow?.comment ? <Banner tone="danger">{t('meeting.rejectedReason', { reason: rejectedRow.comment })}</Banner> : null}
      {status === BookingStatus.Canceled && b.reason ? <Banner tone="off">{t('meeting.cancelledReason', { reason: b.reason })}</Banner> : null}

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

      <ParticipantsCard participants={participants} note={perms.canSeeContent ? b.participant : null} onShowAll={() => setSheet('people')} />
      {b.services?.length ? <ServicesCard services={b.services} /> : null}
      {documents.length ? <DocumentsCard documents={documents} onOpen={(a) => void openAttachment(a)} /> : null}

      <BottomSheet visible={sheet === 'people'} onClose={() => setSheet(null)} title={`${t('meeting.participants')} · ${participants.length}`} scrollable>
        {sortParticipants(participants).map((p) => (
          <PersonRow key={p.id} person={roomPerson(p.user)} trailing={<RoleTags p={p} />} />
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
