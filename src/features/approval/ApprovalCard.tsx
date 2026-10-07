import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatDayMonth, formatTime } from '@/core/time/vn';
import { bookingFrom, bookingTo } from '@/features/room-booking/logic';
import type { BookingApprovalHandlerDto } from '@/features/room-booking/types';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/Avatar';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, DoorOpenIcon, RepeatIcon, UsersIcon, WarningIcon, XIcon } from '@/shared/ui/icons';
import { Tag } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

type Props = {
  item: BookingApprovalHandlerDto;
  /** Pending tab shows the approve / reject footer; processed tab shows `footer` instead. */
  pending: boolean;
  /** Approval levels of the room (null when unknown). */
  levels: number | null;
  /** Pending bookings of other groups overlapping this one. */
  overlaps: number;
  /** Multi-select mode: checkbox on the card, press toggles. */
  selecting: boolean;
  selected: boolean;
  /** Replaces the action footer (processed tab: result and comment). */
  footer?: React.ReactNode;
  onPress: () => void;
  onApprove: () => void;
  onReject: () => void;
};

/** One approval request (design 5a): time column, details, tags, overlap warning and approve / reject footer. */
export function ApprovalCard({ item, pending, levels, overlaps, selecting, selected, footer, onPress, onApprove, onReject }: Props) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const b = item.booking;
  if (!b) return null;
  const from = bookingFrom(b);
  const to = bookingTo(b);
  const series = !!from && !!to && formatDayMonth(from) !== formatDayMonth(to);
  const order = item.approvalHandler?.approvalStep?.order;
  const warnBorder = scheme === 'dark' ? '#5A4318' : '#F3D9A8';
  const warnBg = scheme === 'dark' ? colors['warning-tint'] : '#FFF8EC';

  return (
    <View
      testID={`inbox-item-${b.code}`}
      className="overflow-hidden rounded-[20px]"
      style={{ flexShrink: 0, backgroundColor: colors.elevated, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : overlaps ? warnBorder : colors.line }}
    >
      <Pressable
        accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityState={selecting ? { checked: selected } : undefined}
        accessibilityLabel={`${formatTime(from)}–${formatTime(to)}, ${b.content ?? b.code ?? ''}`}
        onPress={onPress}
        className="flex-row gap-3 active:opacity-80"
        style={{ paddingTop: 14, paddingHorizontal: 14, paddingBottom: 12 }}
      >
        {selecting ? (
          <View
            testID={`inbox-check-${b.code}`}
            className={cn('mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-[7px]', selected ? 'bg-primary' : 'border-2 border-line-strong')}
          >
            {selected ? <Icon icon={CheckIcon} size={12} weight="bold" color="on-primary" /> : null}
          </View>
        ) : null}
        <View style={{ width: 46 }} className="gap-0.5">
          <Text mono weight="semibold" numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontSize: 15, lineHeight: 20 }}>
            {formatTime(from)}
          </Text>
          <Text mono numberOfLines={1} maxFontSizeMultiplier={1.1} className="text-subtle" style={{ fontSize: 12, lineHeight: 16 }}>
            {formatTime(to)}
          </Text>
        </View>
        <View className="w-px self-stretch bg-line-2" />
        <View className="min-w-0 flex-1 gap-1.5">
          <Text weight="semibold" numberOfLines={2} style={{ fontSize: 15, lineHeight: 20 }}>
            {b.content || b.code}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Icon icon={DoorOpenIcon} size={14} color="muted" />
            <Text numberOfLines={1} className="flex-shrink text-meta text-muted">
              {b.room?.name ?? '—'}
            </Text>
            <Text className="text-meta text-muted">·</Text>
            <Avatar name={b.user?.fullname} uri={b.user?.avatarUrl} size={24} />
            <Text numberOfLines={1} className="min-w-0 flex-1 text-meta text-muted">
              {b.user?.fullname ?? ''}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {series && to ? <Tag kind="wait" icon={RepeatIcon} label={t('approvals.seriesUntil', { date: formatDayMonth(to) })} /> : null}
            {order ? <Tag label={levels ? t('approvals.levelOf', { order, total: levels }) : t('approvals.level', { order })} /> : null}
            {b.numberOfParticipants ? <Tag icon={UsersIcon} label={t('meeting.people', { count: b.numberOfParticipants })} /> : null}
          </View>
        </View>
      </Pressable>

      {pending && overlaps ? (
        <View className="flex-row items-start gap-2 px-3.5 py-2.5" style={{ backgroundColor: warnBg }}>
          <View className="pt-px">
            <Icon icon={WarningIcon} size={15} rawColor={colors['warning-text']} />
          </View>
          <Text className="min-w-0 flex-1 text-meta" style={{ color: colors['warning-text'] }}>
            {`${t('approvals.overlap', { count: overlaps })}. ${t('approvals.overlapNote')}`}
          </Text>
        </View>
      ) : null}

      {pending && !selecting ? (
        <View className="h-[46px] flex-row border-t border-line-2">
          <Pressable
            testID={`inbox-reject-${b.code}`}
            accessibilityRole="button"
            accessibilityLabel={t('approvals.reject')}
            onPress={onReject}
            className="flex-1 flex-row items-center justify-center gap-1.5 active:opacity-60"
          >
            <Icon icon={XIcon} size={16} weight="bold" rawColor={colors.danger} />
            <Text weight="semibold" numberOfLines={1} className="text-body" style={{ color: colors.danger }}>
              {t('approvals.reject')}
            </Text>
          </Pressable>
          <View className="w-px bg-line-2" />
          <Pressable
            testID={`inbox-approve-${b.code}`}
            accessibilityRole="button"
            accessibilityLabel={t('approvals.approve')}
            onPress={onApprove}
            className="flex-1 flex-row items-center justify-center gap-1.5 active:opacity-60"
          >
            <Icon icon={CheckIcon} size={16} weight="bold" rawColor={colors.success} />
            <Text weight="semibold" numberOfLines={1} className="text-body" style={{ color: colors.success }}>
              {t('approvals.approve')}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {footer}
    </View>
  );
}
