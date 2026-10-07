import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { sameId } from '@/core/session/userTypes';
import { formatTime } from '@/core/time/vn';
import { AvatarStack } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, DoorOpenIcon } from '@/shared/ui/icons';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { StatusBadge, type BadgeKind } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import { useBookingApprovals } from '../hooks';
import { bookingFrom, bookingPermissions, bookingTo, buildApprovalSteps, type StepView } from '../logic';
import { meetingProgress, meetingTone, type MeetingTone } from '../myMeetings';
import { BookingStatus, type BookingDto } from '../types';

type Props = {
  booking: BookingDto;
  myId?: string;
  now: Date;
  first: boolean;
  last: boolean;
  onPress: () => void;
  onExtend: () => void;
  onEnd: () => void;
  extendBusy?: boolean;
  endBusy?: boolean;
};

const DOT = 12;
const DOT_TOP = 18;

const badgeKind: Record<MeetingTone, BadgeKind> = { live: 'live', waiting: 'wait', approved: 'ok', rejected: 'danger', off: 'off' };

function useDotColors(): Record<MeetingTone, string> {
  const { colors } = useTheme();
  return { live: colors.success, waiting: colors.primary, approved: colors.success, rejected: colors.danger, off: colors['line-strong'] };
}

/** One row of the "Lịch của tôi" timeline (5b): time column, rail with a status dot, and the meeting card. */
export function MyMeetingItem({ booking: b, myId, now, first, last, onPress, onExtend, onEnd, extendBusy, endBusy }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dots = useDotColors();
  const tone = meetingTone(b, now);
  const from = bookingFrom(b);
  const to = bookingTo(b);
  const perms = bookingPermissions(b, myId, [], now);
  // Approval rows are only needed for the waiting stepper and the rejection comment.
  const approvals = useBookingApprovals(tone === 'waiting' || tone === 'rejected' ? b.id : undefined);
  const steps = buildApprovalSteps(approvals.data ?? [], undefined, b.status).filter((s) => s.state !== 'notify');
  const rejection = steps.find((s) => s.state === 'rejected');
  const label = tone === 'live' ? t('status.bookingPhase.live') : t(`status.booking.${String(b.status ?? BookingStatus.Waiting) as '1'}`);
  const roomLine = [b.room?.name, b.room?.code2].filter(Boolean).join(' · ');
  const participants = (b.participants ?? []).filter((p) => p.user);
  const mine = participants.find((p) => sameId(p.userId ?? p.user?.id, myId));
  const role = mine?.isHost ? t('myMeetings.youHost') : mine?.isPrepareContent ? t('myMeetings.youPrepare') : null;
  const progress = tone === 'live' ? meetingProgress(b, now) : null;
  const dim = tone === 'off';

  return (
    <View className="flex-row" style={{ gap: 10, paddingBottom: last ? 0 : 12 }}>
      <View style={{ width: 44, paddingTop: DOT_TOP - 4 }} className="items-end">
        <Text mono weight="semibold" numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontSize: 14, lineHeight: 18 }}>
          {formatTime(from)}
        </Text>
        <Text mono numberOfLines={1} maxFontSizeMultiplier={1.1} className="text-subtle" style={{ fontSize: 11.5, lineHeight: 15 }}>
          {formatTime(to)}
        </Text>
      </View>

      <View style={{ width: DOT }} className="items-center" pointerEvents="none">
        {!first ? <View style={{ position: 'absolute', top: 0, height: DOT_TOP, width: 2, backgroundColor: colors.line }} /> : null}
        {!last ? <View style={{ position: 'absolute', top: DOT_TOP + DOT, bottom: 0, width: 2, backgroundColor: colors.line }} /> : null}
        <View
          testID={`my-meeting-dot-${b.code}`}
          style={{ position: 'absolute', top: DOT_TOP, width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.surface, borderWidth: 3, borderColor: dots[tone] }}
        />
      </View>

      <Pressable
        testID={`my-meeting-${b.code}`}
        accessibilityRole="button"
        accessibilityLabel={`${formatTime(from)}–${formatTime(to)}, ${b.content ?? b.code ?? ''}, ${label}`}
        onPress={onPress}
        className="min-w-0 flex-1 gap-2.5 rounded-card active:opacity-80"
        style={{
          padding: tone === 'live' ? 12.5 : 14,
          backgroundColor: colors.elevated,
          borderWidth: tone === 'live' ? 1.5 : 1,
          borderColor: tone === 'live' ? colors.success : colors.line,
          opacity: dim ? 0.8 : 1,
        }}
      >
        <View className="flex-row items-center gap-2">
          <Text weight="semibold" numberOfLines={1} className="min-w-0 flex-1" style={{ fontSize: 14.5, lineHeight: 20 }}>
            {b.content || b.code}
          </Text>
          <StatusBadge kind={badgeKind[tone]} label={label} />
        </View>
        <View className="flex-row items-center gap-1.5">
          <Icon icon={DoorOpenIcon} size={14} color="muted" />
          <Text numberOfLines={1} className="min-w-0 flex-1 text-meta text-muted">
            {roomLine || '—'}
          </Text>
        </View>

        {progress ? (
          <View className="gap-2">
            <ProgressBar value={progress.ratio} color={colors.success} />
            <Text weight="semibold" numberOfLines={1} className="text-meta" style={{ color: colors['success-text'] }}>
              {t('myMeetings.minutesLeft', { count: progress.minutesLeft })}
            </Text>
            {perms.canEndEarly || perms.canExtend ? (
              <View className="flex-row gap-2">
                {perms.canEndEarly ? <Button testID={`my-meeting-end-${b.code}`} className="flex-1" size="sm" variant="ghost" label={t('myMeetings.end')} loading={endBusy} onPress={onEnd} /> : null}
                {perms.canExtend ? <Button testID={`my-meeting-extend-${b.code}`} className="flex-1" size="sm" label={t('myMeetings.extend')} loading={extendBusy} onPress={onExtend} /> : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {tone === 'waiting' && steps.length ? <MiniStepper steps={steps} /> : null}

        {tone === 'approved' && participants.length ? (
          <View className="flex-row items-center gap-2">
            <AvatarStack size={24} people={participants.map((p) => ({ name: p.user?.fullname, uri: p.user?.avatarUrl }))} />
            {role ? (
              <Text weight="medium" numberOfLines={1} className="min-w-0 flex-1 text-right text-meta text-muted">
                {role}
              </Text>
            ) : null}
          </View>
        ) : null}

        {tone === 'rejected' && rejection?.comment ? (
          <View className="rounded-[10px] px-3 py-2" style={{ backgroundColor: colors['danger-tint'] }}>
            <Text numberOfLines={3} className="text-meta" style={{ color: colors['danger-deep'] }}>
              {rejection.comment}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

/** Approval levels: done = green dot with a check, waiting = primary ring, plus "Cấp n đang chờ". */
function MiniStepper({ steps }: { steps: StepView[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pending = steps.find((s) => s.state === 'pending');
  return (
    <View className="flex-row items-center gap-1.5">
      {steps.map((s, i) => (
        <View key={s.key} className="flex-row items-center gap-1.5">
          {i > 0 ? <View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: colors.line }} /> : null}
          {s.state === 'approved' ? (
            <View className="h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: colors.success }}>
              <Icon icon={CheckIcon} size={10} weight="bold" rawColor="#FFFFFF" />
            </View>
          ) : (
            <View className="h-4 w-4 rounded-full" style={{ borderWidth: 2, borderColor: s.state === 'pending' ? colors.primary : colors['line-strong'] }} />
          )}
        </View>
      ))}
      {pending ? (
        <Text weight="medium" numberOfLines={1} className="min-w-0 flex-1 pl-1 text-meta text-muted">
          {t('myMeetings.levelWaiting', { order: pending.order })}
        </Text>
      ) : null}
    </View>
  );
}
