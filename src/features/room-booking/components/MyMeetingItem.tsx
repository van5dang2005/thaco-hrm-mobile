import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatTime } from '@/core/time/vn';
import { AvatarStack } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { PressableCard } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, DoorOpenIcon, PlusIcon, RepeatIcon, SquareIcon } from '@/shared/ui/icons';
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
  /** Position in its series ("1/5"), when the booking belongs to one. */
  series?: { index: number; total: number } | null;
  onPress: () => void;
  onExtend: () => void;
  onEnd: () => void;
  extendBusy?: boolean;
  endBusy?: boolean;
};

const badgeKind: Record<MeetingTone, BadgeKind> = { live: 'live', waiting: 'wait', approved: 'ok', rejected: 'danger', off: 'off' };

/**
 * One meeting of "Lịch của tôi" (5b): a time box, title, room and participants. Live meetings get a
 * green "Đang diễn ra" strip with progress and Kết thúc sớm / Gia hạn; waiting ones a mini approval stepper.
 */
export function MyMeetingItem({ booking: b, myId, now, series, onPress, onExtend, onEnd, extendBusy, endBusy }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
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
  const progress = tone === 'live' ? meetingProgress(b, now) : null;

  return (
    <PressableCard
      testID={`my-meeting-${b.code}`}
      accessibilityLabel={`${formatTime(from)}–${formatTime(to)}, ${b.content ?? b.code ?? ''}, ${label}`}
      onPress={onPress}
      className="overflow-hidden"
      style={{ opacity: tone === 'off' ? 0.8 : 1 }}
    >
      {progress ? (
        <View className="h-[34px] flex-row items-center gap-2.5 bg-success-tint px-3.5">
          <View className="h-3 w-3 items-center justify-center rounded-full bg-success">
            <View className="h-1.5 w-1.5 rounded-full bg-white" />
          </View>
          <Text weight="bold" numberOfLines={1} className="text-success-text" style={{ fontSize: 12, lineHeight: 16 }}>
            {label}
          </Text>
          <View className="flex-1">
            <ProgressBar value={progress.ratio} color={colors.success} height={5} />
          </View>
          <Text mono weight="bold" className="text-success-text" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {t('myMeetings.left', { time: `${progress.minutesLeft}′` })}
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-3 p-3.5">
        <View className="w-[58px] items-center justify-center gap-1 self-start rounded-[12px] bg-panel py-2.5">
          <Text mono weight="bold" numberOfLines={1} maxFontSizeMultiplier={1.1} className="text-ink" style={{ fontSize: 15, lineHeight: 19 }}>
            {formatTime(from)}
          </Text>
          <View className="h-px w-3 bg-line-strong" />
          <Text mono numberOfLines={1} maxFontSizeMultiplier={1.1} className="text-subtle" style={{ fontSize: 12, lineHeight: 15 }}>
            {formatTime(to)}
          </Text>
        </View>

        <View className="min-w-0 flex-1 gap-2">
          <View className="flex-row items-start gap-2">
            <Text weight="bold" numberOfLines={2} className="min-w-0 flex-1 text-ink" style={{ fontSize: 15, lineHeight: 20 }}>
              {b.content || b.code}
            </Text>
            {tone !== 'live' ? <StatusBadge kind={badgeKind[tone]} label={label} /> : null}
          </View>
          <View className="flex-row items-center gap-1.5">
            <Icon icon={DoorOpenIcon} size={14} color="muted" />
            <Text numberOfLines={1} className="min-w-0 flex-1 text-muted" style={{ fontSize: 12.5, lineHeight: 17 }}>
              {roomLine || '—'}
            </Text>
            {participants.length && tone !== 'rejected' ? <AvatarStack size={22} max={3} people={participants.map((p) => ({ name: p.user?.fullname, uri: p.user?.avatarUrl }))} /> : null}
          </View>

          {progress && (perms.canEndEarly || perms.canExtend) ? (
            <View className="flex-row gap-2 pt-1">
              {perms.canEndEarly ? (
                <Button testID={`my-meeting-end-${b.code}`} className="flex-1" size="md" variant="neutral" icon={SquareIcon} label={t('meeting.endEarly')} loading={endBusy} onPress={onEnd} />
              ) : null}
              {perms.canExtend ? <Button testID={`my-meeting-extend-${b.code}`} className="flex-1" size="md" icon={PlusIcon} label={t('myMeetings.extend')} loading={extendBusy} onPress={onExtend} /> : null}
            </View>
          ) : null}

          {tone === 'waiting' && (steps.length || series) ? <MiniStepper steps={steps} series={series} /> : null}

          {tone === 'rejected' && rejection?.comment ? (
            <View className="rounded-[10px] px-3 py-2" style={{ backgroundColor: colors['danger-tint'] }}>
              <Text numberOfLines={3} className="text-meta" style={{ color: colors['danger-deep'] }}>
                {rejection.comment}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </PressableCard>
  );
}

/** "✓ Cấp 1 — ○ Cấp 2" in a #F4F7FB box, with "⟳ 1/5" for a series. */
function MiniStepper({ steps, series }: { steps: StepView[]; series?: { index: number; total: number } | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View className="min-h-[36px] flex-row items-center gap-2 rounded-[12px] bg-panel px-2.5">
      {steps.map((s, i) => {
        const done = s.state === 'approved';
        const current = s.state === 'pending';
        return (
          <View key={s.key} className="flex-row items-center gap-1.5">
            {i > 0 ? <View className="h-0.5 w-3.5 rounded-full bg-line-strong" /> : null}
            {done ? (
              <View className="h-4 w-4 items-center justify-center rounded-full bg-success">
                <Icon icon={CheckIcon} size={10} weight="bold" rawColor="#FFFFFF" />
              </View>
            ) : (
              <View className="h-4 w-4 rounded-full" style={{ borderWidth: 2, borderColor: current ? colors.primary : colors['line-strong'] }} />
            )}
            <Text weight={current ? 'bold' : 'medium'} numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, color: current ? colors.primary : colors['ink-2'] }}>
              {t('meeting.level', { order: s.order })}
            </Text>
          </View>
        );
      })}
      {series ? (
        <View className="ml-auto flex-row items-center gap-1">
          <Icon icon={RepeatIcon} size={13} color="muted" />
          <Text mono className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {`${series.index}/${series.total}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
