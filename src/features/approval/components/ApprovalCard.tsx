import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatDayMonth, formatTime, isSameVnDay, parseServerDate, toDateKey, vnParts, weekdayOf } from '@/core/time/vn';
import { useBookingApprovals } from '@/features/room-booking/hooks/useBookingApprovals';
import type { BookingApprovalHandlerDto } from '@/features/room-booking/types';
import { bookingFrom, bookingTo } from '@/features/room-booking/utils/booking';
import { cn } from '@/shared/lib/cn';
import { ApprovalActions } from '@/shared/ui/ApprovalActions';
import { Avatar } from '@/shared/ui/Avatar';
import { PressableCard } from '@/shared/ui/Card';
import { DateBadge } from '@/shared/ui/DateBadge';
import { Icon } from '@/shared/ui/Icon';
import { type AppIcon, CalendarIcon, CheckIcon, ClockIcon, DoorOpenIcon, RepeatIcon, TriangleAlertIcon, UsersIcon } from '@/shared/ui/icons';
import { StatusBadge, Tag } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import { isSeries, startsWithin } from '../utils/approval';

type Props = {
  item: BookingApprovalHandlerDto;
  /** My approval level for this request (null when unknown). */
  order: number | null;
  /** Pending tab shows the approve / reject actions; the processed tab shows `footer` instead. */
  pending: boolean;
  /** Approval levels of the room (null when unknown). */
  levels: number | null;
  /** Pending bookings of other groups overlapping this one. */
  overlaps: number;
  /** "5 buổi · hằng tuần" for a series (aggregated rows only carry the first and last session). */
  repeat?: string;
  /** Multi-select mode: checkbox on the card, press toggles. */
  selecting: boolean;
  selected: boolean;
  now: Date;
  footer?: ReactNode;
  onPress: () => void;
  onDetail: () => void;
  onApprove: () => void;
  onReject: () => void;
};

/**
 * One approval request (design 5a): date badge, level / urgency tags, title and requester, a 2×2
 * info block, the level progress, an overlap warning and "Chi tiết › · ✕ Từ chối · ✓ Duyệt".
 */
export function ApprovalCard({ item, order, pending, levels, overlaps, repeat, selecting, selected, now, footer, onPress, onDetail, onApprove, onReject }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const b = item.booking;
  // Earlier levels' approvers, for the "Cấp 1 ✓ → Cấp 2 · Bạn" line.
  const rows = useBookingApprovals(pending && order && order > 1 ? b?.id : undefined);
  if (!b) return null;
  const from = bookingFrom(b);
  const to = bookingTo(b);
  const series = isSeries(b);
  const soon = pending ? startsWithin(from, now, 24 * 60) : null;
  const final = !!order && !!levels && order >= levels;
  const created = parseServerDate(b.createdAt);
  const createdLabel = created ? (isSameVnDay(created, now) ? formatTime(created) : isSameVnDay(created, new Date(now.getTime() - 86_400_000)) ? t('approvals.yesterday') : formatDayMonth(created)) : '';
  const weekday = from ? weekdayOf(toDateKey(from)) : 1;
  const unit = b.user?.departments?.[0]?.name;
  const seats = b.room?.numberOfSeats;
  const previous = (rows.data ?? []).filter((r) => r.isApproved && (r.approvalHandler?.approvalStep?.order ?? 0) < (order ?? 0));

  return (
    <PressableCard
      testID={`inbox-item-${b.code}`}
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityLabel={`${formatTime(from)}–${formatTime(to)}, ${b.content ?? b.code ?? ''}`}
      onPress={onPress}
      selected={selected}
      className="gap-3 overflow-visible p-3.5"
    >
      <View className="flex-row gap-3">
        {selecting ? (
          <View testID={`inbox-check-${b.code}`} className={cn('mt-3 h-[22px] w-[22px] items-center justify-center rounded-[7px]', selected ? 'bg-primary' : 'border-2 border-line-strong')}>
            {selected ? <Icon icon={CheckIcon} size={12} weight="bold" color="on-primary" /> : null}
          </View>
        ) : null}
        {from ? (
          <DateBadge weekday={t(`time.weekdayShort.${String(weekday) as '0'}`)} day={String(vnParts(from).day).padStart(2, '0')} month={`Th${vnParts(from).month}`} />
        ) : null}
        <View className="min-w-0 flex-1 gap-1.5">
          <View className="flex-row flex-wrap gap-1.5">
            {order ? (
              final ? (
                <View className="h-[22px] justify-center rounded-[7px] bg-primary px-2">
                  <Text weight="bold" className="text-on-primary" style={{ fontSize: 11, lineHeight: 14 }}>
                    {t('approvals.levelFinal', { order, total: levels })}
                  </Text>
                </View>
              ) : (
                <Tag kind="wait" label={levels ? t('approvals.levelOf', { order, total: levels }) : t('approvals.level', { order })} />
              )
            ) : null}
            {soon !== null ? <StatusBadge kind="warn" icon={ClockIcon} label={t('approvals.startsIn', { time: soon >= 60 ? t('time.hours', { count: Math.round(soon / 60) }) : t('time.minutes', { count: soon }) })} /> : null}
            {pending && overlaps ? <StatusBadge kind="warn" icon={TriangleAlertIcon} label={t('approvals.conflictTag')} /> : null}
          </View>
          <Text weight="bold" numberOfLines={2} className="text-ink" style={{ fontSize: 15, lineHeight: 20 }}>
            {b.content || b.code}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Avatar name={b.user?.fullname} uri={b.user?.avatarUrl} size={20} />
            <Text numberOfLines={1} className="min-w-0 flex-1 text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
              {[b.user?.fullname, unit, createdLabel].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row flex-wrap rounded-[14px] bg-panel px-3 py-2.5" style={{ rowGap: 10 }}>
        <Info icon={ClockIcon} label={t('approvals.time')} value={`${formatTime(from)}–${formatTime(to)}`} mono />
        <Info icon={DoorOpenIcon} label={t('approvals.room')} value={b.room?.name ?? '—'} />
        <Info icon={UsersIcon} label={t('approvals.people')} value={seats ? t('approvals.seats', { people: b.numberOfParticipants ?? 0, seats }) : String(b.numberOfParticipants ?? 0)} />
        {series ? (
          <Info icon={RepeatIcon} label={t('approvals.repeat')} value={repeat ?? t('approvals.seriesUntil', { date: formatDayMonth(to) })} />
        ) : (
          <Info icon={CalendarIcon} label={t('approvals.date')} value={from ? `${t(`time.weekday.${String(weekday) as '0'}`)} ${formatDayMonth(from)}` : '—'} />
        )}
      </View>

      {pending && order && order > 1 ? (
        <View className="flex-row items-center gap-2">
          <View className="h-4 w-4 items-center justify-center rounded-full bg-success">
            <Icon icon={CheckIcon} size={10} weight="bold" rawColor="#FFFFFF" />
          </View>
          <Text numberOfLines={1} className="flex-shrink text-ink-2" style={{ fontSize: 12, lineHeight: 16 }}>
            {[t('approvals.level', { order: order - 1 }), previous[0]?.approvalHandler?.user?.fullname?.split(' ').slice(-2).join(' ')].filter(Boolean).join(' · ')}
          </Text>
          <View className="h-0.5 flex-1 rounded-full bg-primary" />
          <View className="h-4 w-4 items-center justify-center rounded-full border-2 border-primary">
            <View className="h-1.5 w-1.5 rounded-full bg-primary" />
          </View>
          <Text weight="bold" className="text-primary" style={{ fontSize: 12, lineHeight: 16 }}>
            {`${t('approvals.level', { order })} · ${t('approvals.you')}`}
          </Text>
        </View>
      ) : null}

      {pending && overlaps ? (
        <View className="flex-row items-start gap-2 rounded-[12px] px-3 py-2.5" style={{ backgroundColor: colors['warn-box'] }}>
          <View className="pt-px">
            <Icon icon={TriangleAlertIcon} size={14} color="warning" />
          </View>
          <Text className="min-w-0 flex-1 text-warning-text" style={{ fontSize: 12.5, lineHeight: 17 }}>
            {t('approvals.overlapBox', { count: overlaps })}
          </Text>
        </View>
      ) : null}

      {pending && !selecting ? <ApprovalActions testID={`inbox-${b.code}`} onDetail={onDetail} onReject={onReject} onApprove={onApprove} /> : null}
      {footer}
    </PressableCard>
  );
}

function Info({ icon, label, value, mono }: { icon: AppIcon; label: string; value: string; mono?: boolean }) {
  return (
    <View className="w-1/2 flex-row items-center gap-2 pr-2">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-elevated">
        <Icon icon={icon} size={14} color="muted" />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11, lineHeight: 14 }}>
          {label}
        </Text>
        <Text mono={mono} weight="bold" numberOfLines={1} className="text-ink" style={{ fontSize: 13, lineHeight: 17 }}>
          {value}
        </Text>
      </View>
    </View>
  );
}
