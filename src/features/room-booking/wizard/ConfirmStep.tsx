import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { isApiError } from '@/core/api/ApiError';
import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { sameId } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { formatKey } from '@/core/time/vn';
import { AvatarStack } from '@/shared/ui/Avatar';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Card } from '@/shared/ui/Card';
import { BellIcon, InfoIcon, SendIcon } from '@/shared/ui/icons';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { Tag } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { bookingsApi } from '../api';
import { draftToForm, useBookingDraft } from '../draftStore';
import { useRooms, useRoomSteps } from '../hooks';
import { ApprovalActionType, BookingStatus, type ApprovalHandlerDto, type ApprovalStepDto } from '../types';
import { WizardHeader } from '../ui/WizardHeader';
import { BookingTicket } from '../ui/BookingTicket';
import { useDraftLabels } from '../wizardData';
import { useGoToStep, type WizardStep } from './navigation';

/** Which step fixes a server rejection (CLAUDE.md §3.8). */
const stepForError: Record<string, WizardStep> = {
  BOOKING_CONFLICT: 'time',
  BOOKING_OUTSIDE_HOURS: 'time',
  BOOKING_LIMIT_DAY: 'time',
  FROM_DATE_BEFORE_TO_DATE: 'time',
  FROM_DATE_BEFORE_OR_EQ_TO_DATE: 'time',
  FROM_TO_DATE_REQUIRED: 'time',
  BOOKING_CROSS_LEVEL: 'index',
  ROOM_ID_REQUIRED: 'index',
  LIMIT_5_ATTACHMENTS: 'details',
  EXCEED_10MB_LIMIT: 'details',
};

/** B4 (4d): ticket summary, what happens next, submit. */
export function ConfirmStep() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const draft = useBookingDraft((s) => s.draft);
  const reset = useBookingDraft((s) => s.reset);
  const goToStep = useGoToStep();
  const labels = useDraftLabels(draft);
  const rooms = useRooms(draft.areaId);
  const room = rooms.data?.find((r) => sameId(r.id, draft.roomId));
  const steps = useRoomSteps(draft.roomId);
  const [failure, setFailure] = useState<{ message: string; step?: WizardStep } | null>(null);
  const editing = draft.mode === 'edit' ? draft.edit : undefined;

  const submit = useMutation({
    mutationFn: async () => {
      const form = draftToForm(draft);
      if (editing) return [await bookingsApi.updateGroup(editing.bookingId, editing.groupId, form)];
      return bookingsApi.createMultiDay(form);
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: qk.bookings.root });
      void queryClient.invalidateQueries({ queryKey: qk.approvals.root });
      const first = created?.[0];
      reset();
      if (editing) {
        toast.success(t('booking.updated'));
        router.dismissTo({ pathname: '/rooms/bookings/[id]', params: { id: editing.bookingId } });
        return;
      }
      toast.success(first?.status === BookingStatus.Approved ? t('booking.createdApproved') : t('booking.created'));
      if (first) router.replace({ pathname: '/rooms/bookings/[id]', params: { id: first.id } });
      else router.back();
    },
    onError: (e) => setFailure({ message: errorMessage(e, t), step: isApiError(e) ? stepForError[e.errorCode] : undefined }),
  });

  const host = draft.participants.find((p) => p.isHost);
  const services = (room?.services ?? []).filter((s) => draft.serviceIds.some((id) => sameId(id, s.id))).map((s) => s.name);
  const documents = draft.keptAttachments.length + draft.files.length + draft.links.length;
  const extra = room?.code2 ?? room?.code;
  const overCapacity = room?.numberOfSeats != null && draft.people > room.numberOfSeats;
  const rows = [
    { label: t('booking.rowRoom'), value: [room?.name, extra].filter(Boolean).join(' · ') || '—' },
    {
      label: t('booking.rowParticipants'),
      value: draft.participants.length
        ? host
          ? t('booking.participantsValue', { count: draft.participants.length, name: host.user.fullname ?? '' })
          : t('booking.participantsValueNoHost', { count: draft.participants.length })
        : t('booking.none'),
    },
    ...(draft.participantText.trim() ? [{ label: t('booking.rowOthers'), value: draft.participantText.trim() }] : []),
    { label: t('booking.rowPeople'), value: String(draft.people) },
    { label: t('booking.rowServices'), value: services.length ? services.join(', ') : t('booking.none') },
    { label: t('booking.rowDocuments'), value: documents ? t('booking.documentsValue', { count: documents }) : t('booking.none') },
  ];

  const approveSteps = (steps ?? []).filter((s) => s.isActive !== false && s.actionType === ApprovalActionType.Approve);
  const notifySteps = (steps ?? []).filter((s) => s.isActive !== false && s.actionType === ApprovalActionType.Notify);
  const levelCount = new Set(approveSteps.map((s) => s.order ?? 0)).size;
  const note =
    editing
      ? t('booking.afterSubmitEdit')
      : steps === undefined
        ? t('booking.afterSubmitUnknown')
        : !approveSteps.length
          ? t('booking.afterSubmitNoFlow')
          : labels.sessions.length > 1
            ? t('booking.conflictNote')
            : t('booking.afterSubmitNoteSingle');
  const lastSession = labels.sessions[labels.sessions.length - 1];
  const datesShort = labels.recurring && lastSession && lastSession !== draft.dateKey ? `${labels.dayShort} → ${formatKey(lastSession, false)}` : labels.dayShort;

  if (!draft.roomId) return <Redirect href="/rooms/book" />;

  const footer = (
    <>
      <Button className="flex-1" variant="soft" label={t('booking.edit')} onPress={() => goToStep('details')} />
      <Button
        testID="booking-submit"
        className="flex-[1.9]"
        label={editing ? t('booking.saveChanges') : labels.sessions.length > 1 ? t('booking.submitSessions', { count: labels.sessions.length }) : t('booking.submit')}
        loading={submit.isPending}
        trailing={submit.isPending ? undefined : <Icon icon={SendIcon} size={16} weight="bold" color="on-primary" />}
        onPress={() => {
          setFailure(null);
          submit.mutate();
        }}
      />
    </>
  );

  return (
    <ModuleScreen
      header={<WizardHeader testID="booking-confirm-header" step={4} />}
      footer={footer}
      footerNote={
        failure ? (
          <View className="gap-2">
            <Banner tone="danger" testID="booking-submit-error">
              {failure.message}
            </Banner>
            {failure.step ? (
              <Button
                variant="ghost"
                size="md"
                label={failure.step === 'index' ? t('booking.backToRoom') : failure.step === 'time' ? t('booking.backToTime') : t('booking.detailsTitle')}
                onPress={() => goToStep(failure.step!)}
              />
            ) : null}
          </View>
        ) : null
      }
    >
      <BookingTicket badge={labels.badge} dates={datesShort} time={labels.timeSpaced} title={draft.content.trim()} confidential={draft.confidential} rows={rows} />

      <Card className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Text weight="bold" accessibilityRole="header" style={{ fontSize: 15, lineHeight: 20 }}>
            {t('booking.approvalFlow')}
          </Text>
          {levelCount ? (
            <Text className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
              {t('booking.levelsCount', { count: levelCount })}
            </Text>
          ) : null}
        </View>
        {steps !== undefined && !editing && approveSteps.length ? <ApprovalFlow approve={approveSteps} notify={notifySteps} /> : null}
        <View className="flex-row items-start gap-1.5">
          <Icon icon={InfoIcon} size={13} color="muted" />
          <Text className="flex-1 text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
            {note}
          </Text>
        </View>
      </Card>

      {overCapacity ? <Banner tone="warning">{t('booking.overCapacity', { people: draft.people, seats: room?.numberOfSeats ?? 0 })}</Banner> : null}
    </ModuleScreen>
  );
}

type Level = { key: string; order: number; name: string; handlers: ApprovalHandlerDto[]; notify: boolean };

/** Vertical flow (4d): one numbered box per level (steps sharing an order are one level, any approver suffices), then the notify step. */
function ApprovalFlow({ approve, notify }: { approve: ApprovalStepDto[]; notify: ApprovalStepDto[] }) {
  const orders = [...new Set(approve.map((s) => s.order ?? 0))].sort((a, b) => a - b);
  const levels: Level[] = [
    ...orders.map((order) => {
      const steps = approve.filter((s) => (s.order ?? 0) === order);
      return {
        key: `level-${order}`,
        order,
        name: steps.map((s) => s.name).filter(Boolean).join(', '),
        handlers: steps.flatMap((s) => s.approvalHandlers ?? []),
        notify: false,
      };
    }),
    ...notify.map((s, i) => ({ key: `notify-${s.id}`, order: orders.length + i + 1, name: s.name ?? '', handlers: s.approvalHandlers ?? [], notify: true })),
  ];
  return (
    <View>
      {levels.map((level, i) => (
        <FlowRow key={level.key} level={level} index={i} last={i === levels.length - 1} />
      ))}
    </View>
  );
}

function FlowRow({ level, index, last }: { level: Level; index: number; last: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const people = level.handlers.map((h) => h.user).filter((u): u is NonNullable<typeof u> => !!u);
  const names = people.map((u) => u.fullname).filter(Boolean).join(', ');
  const sub = people[0]?.jobTitles?.[0]?.name ?? people[0]?.departments?.[0]?.name ?? '';
  const heading = level.notify ? `${t('booking.flowNotify')}` : `${t('booking.flowLevel', { order: index + 1 })}${level.name ? ` · ${level.name}` : ''}`;
  return (
    <View className="flex-row gap-3">
      <View className="items-center" style={{ width: 28 }}>
        <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: level.notify ? colors['off-tint'] : colors['primary-tint'] }}>
          {level.notify ? (
            <Icon icon={BellIcon} size={14} color="muted" />
          ) : (
            <Text mono weight="bold" style={{ fontSize: 12.5, lineHeight: 16, color: colors.primary }}>
              {String(index + 1)}
            </Text>
          )}
        </View>
        {!last ? <View className="w-0.5 flex-1 bg-line-2" style={{ marginVertical: 4 }} /> : null}
      </View>
      <View className={`min-w-0 flex-1 gap-2 rounded-[14px] bg-panel p-3 ${last ? '' : 'mb-2.5'}`}>
        <View className="flex-row items-center justify-between gap-2">
          <Text weight="bold" numberOfLines={1} className="flex-shrink text-muted" style={{ fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            {heading}
          </Text>
          {level.notify ? (
            <Tag label={t('booking.notifyOnly')} />
          ) : people.length > 1 ? (
            <Tag label={t('booking.oneOf', { count: people.length })} />
          ) : (
            <Tag kind="wait" label={t('booking.tagApprove')} />
          )}
        </View>
        {people.length ? (
          <View className="flex-row items-center gap-2.5">
            <AvatarStack size={26} max={3} people={people.map((u) => ({ name: u.fullname, uri: u.avatarUrl }))} />
            <View className="min-w-0 flex-1">
              <Text weight="bold" numberOfLines={1} className="text-ink" style={{ fontSize: 13.5, lineHeight: 18 }}>
                {names}
              </Text>
              {sub ? (
                <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
                  {sub}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
