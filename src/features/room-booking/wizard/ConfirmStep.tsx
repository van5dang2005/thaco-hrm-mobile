import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Animated, { SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isApiError } from '@/core/api/ApiError';
import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { sameId } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { type AppIcon, BellIcon, CheckCircleIcon, PaperPlaneTiltIcon, SealCheckIcon } from '@/shared/ui/icons';
import { useLightStatusBar } from '@/shared/ui/ScreenShell';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { bookingsApi } from '../api';
import { draftToForm, useBookingDraft } from '../draftStore';
import { useRooms, useRoomSteps } from '../hooks';
import { ApprovalActionType, BookingStatus, type ApprovalStepDto } from '../types';
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

type FlowNode = { key: string; icon: AppIcon; label: string; sub: string; tone: 'primary' | 'default' | 'success' };

/** B4 (4d): ticket summary, what happens next, submit. */
export function ConfirmStep() {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  useLightStatusBar();
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
  const nodes = useFlowNodes(approveSteps, notifySteps);
  const note =
    editing
      ? t('booking.afterSubmitEdit')
      : steps === undefined
        ? t('booking.afterSubmitUnknown')
        : !approveSteps.length
          ? t('booking.afterSubmitNoFlow')
          : labels.sessions.length > 1
            ? t('booking.afterSubmitNote')
            : t('booking.afterSubmitNoteSingle');

  if (!draft.roomId) return <Redirect href="/rooms/book" />;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.header }}>
      <View style={{ paddingTop: insets.top }} className="px-3">
        <WizardHeader testID="booking-confirm-header" title={t('booking.confirmTitle')} step={4} />
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}>
        <BookingTicket
          badge={labels.badge}
          time={labels.timeSpaced}
          dates={labels.dates}
          title={draft.content.trim()}
          confidential={draft.confidential}
          rows={rows}
        />
      </ScrollView>

      <Animated.View
        entering={SlideInRight.duration(220)}
        className={cn('gap-4 rounded-t-sheet bg-surface px-4 pt-5', scheme === 'dark' && 'border-x border-t border-line')}
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}
      >
        <View className="gap-1">
          <Text weight="semibold" accessibilityRole="header" className="text-card">
            {t('booking.afterSubmit')}
          </Text>
          <Text className="text-sub-sm text-muted">{note}</Text>
        </View>

        {steps !== undefined && !editing ? <FlowDiagram nodes={nodes} /> : null}
        {overCapacity ? <Banner tone="warning">{t('booking.overCapacity', { people: draft.people, seats: room?.numberOfSeats ?? 0 })}</Banner> : null}

        {failure ? (
          <View className="gap-2">
            <Banner tone="danger" testID="booking-submit-error">
              {failure.message}
            </Banner>
            {failure.step ? (
              <Button
                variant="ghost"
                size="lg"
                label={failure.step === 'index' ? t('booking.backToRoom') : failure.step === 'time' ? t('booking.backToTime') : t('booking.detailsTitle')}
                onPress={() => goToStep(failure.step!)}
              />
            ) : null}
          </View>
        ) : null}

        <Button
          testID="booking-submit"
          icon={PaperPlaneTiltIcon}
          label={editing ? t('booking.saveChanges') : labels.sessions.length > 1 ? t('booking.submitSessions', { count: labels.sessions.length }) : t('booking.submit')}
          loading={submit.isPending}
          onPress={() => {
            setFailure(null);
            submit.mutate();
          }}
        />
      </Animated.View>
    </View>
  );
}

function useFlowNodes(approve: ApprovalStepDto[], notify: ApprovalStepDto[]): FlowNode[] {
  const { t } = useTranslation();
  const you: FlowNode = { key: 'you', icon: PaperPlaneTiltIcon, label: t('booking.flowYou'), sub: t('booking.flowToday'), tone: 'primary' };
  if (!approve.length) {
    return [you, { key: 'active', icon: CheckCircleIcon, label: t('booking.flowActive'), sub: t('booking.flowActiveSub'), tone: 'success' }];
  }
  // Steps sharing an order are one level (any approver of the level can approve).
  const levels = [...new Set(approve.map((s) => s.order ?? 0))].sort((a, b) => a - b);
  return [
    you,
    ...levels.map((order) => ({
      key: `level-${order}`,
      icon: SealCheckIcon,
      label: t('booking.flowLevel', { order }),
      sub: approve
        .filter((s) => (s.order ?? 0) === order)
        .map((s) => s.name)
        .filter(Boolean)
        .join(', '),
      tone: 'default' as const,
    })),
    ...(notify.length
      ? [{ key: 'notify', icon: BellIcon, label: notify.map((s) => s.name).filter(Boolean)[0] ?? t('booking.flowNotify'), sub: t('booking.flowNotifySub'), tone: 'default' as const }]
      : []),
  ];
}

/** Horizontal flow: 36pt nodes on a connecting rule. Scrolls when a room has many levels. */
function FlowDiagram({ nodes }: { nodes: FlowNode[] }) {
  const { colors } = useTheme();
  const fixed = nodes.length > 5;
  const body = (
    <View className="flex-row" style={fixed ? { width: nodes.length * 80 } : undefined}>
      <View className="absolute h-0.5" style={{ top: 17, left: `${50 / nodes.length}%`, right: `${50 / nodes.length}%`, backgroundColor: colors.line }} />
      {nodes.map((node) => (
        <View key={node.key} className="flex-1 items-center gap-1.5" accessible accessibilityLabel={`${node.label}, ${node.sub}`}>
          <View
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: node.tone === 'primary' ? colors.primary : node.tone === 'success' ? colors.success : colors['icon-ring'] }}
          >
            <Icon icon={node.icon} size={17} rawColor={node.tone === 'default' ? colors['primary-tint-text'] : node.tone === 'primary' ? colors['on-primary'] : '#FFFFFF'} />
          </View>
          <Text weight="semibold" numberOfLines={1} className="px-0.5 text-center text-meta">
            {node.label}
          </Text>
          {node.sub ? (
            <Text numberOfLines={2} className="px-0.5 text-center text-meta-sm text-subtle">
              {node.sub}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
  return fixed ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {body}
    </ScrollView>
  ) : (
    body
  );
}
