import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { diffDays, formatKey, formatTime, toDateKey, todayKey, weekdayOf } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { HeaderPill, useHeaderDot } from '@/shared/ui/HeaderPill';
import { Icon } from '@/shared/ui/Icon';
import { CalendarDaysIcon, LockIcon } from '@/shared/ui/icons';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { onBlue, useHeaderColors } from '@/shared/ui/ScreenShell';
import { bookingBadgeKind, type BadgeKind } from '@/shared/ui/status';
import { Text } from '@/shared/ui/Text';

import { BookingStatus, type BookingDto } from '../types';
import { bookingFrom, bookingPhase, bookingTo } from '../utils/booking';

type Props = {
  booking: BookingDto;
  /** The content, or the confidential placeholder when `hidden`. */
  title: string;
  hidden?: boolean;
  /** Neutral pills after the status ("Buổi 1/5", "Hằng tuần"). */
  tags?: string[];
};

/**
 * Meeting summary on the blue header (6b, 6c): status pill and tags, the title, the time range in large
 * mono with the duration (or "còn N phút" and a progress bar while it runs), then the full date and how
 * far away it is.
 */
export function MeetingHero({ booking, title, hidden, tags = [] }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fg, text2 } = useHeaderColors();
  const now = useNow(15_000);
  const from = bookingFrom(booking);
  const to = bookingTo(booking);
  const status = booking.status ?? BookingStatus.Waiting;
  const phase = bookingPhase(booking, now);
  const approved = status === BookingStatus.Approved;
  const live = approved && phase === 'live';
  const struck = status === BookingStatus.Canceled || status === BookingStatus.Rejected;

  // An approved booking never changes status by itself: once it starts, the pill shows the phase.
  const kind: BadgeKind = live ? 'live' : approved && phase === 'past' ? 'off' : bookingBadgeKind(status);
  const label = approved && phase !== 'upcoming' ? t(`status.bookingPhase.${phase}`) : t(`status.booking.${String(status) as '1'}`);
  const dot = useHeaderDot(kind);
  const green = colors['header-dot-live'];

  // Right of the time: what is left while it runs, otherwise the length ("45 phút", "2 giờ", "1 giờ 30 phút").
  const minutes = from && to ? Math.round((to.getTime() - from.getTime()) / 60_000) : 0;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const side =
    live && to
      ? t('meeting.leftMinutes', { count: Math.max(0, Math.ceil((to.getTime() - now.getTime()) / 60_000)) })
      : minutes <= 0
        ? ''
        : !hours
          ? t('meeting.minutes', { count: rest })
          : rest
            ? t('meeting.hoursMinutes', { hours, minutes: rest })
            : t('time.hours', { count: hours });
  const progress = live && from && to ? (now.getTime() - from.getTime()) / (to.getTime() - from.getTime()) : 0;

  // "Thứ Tư, 14/10/2026" then how far away: "Hôm nay", "Ngày mai", "Còn 4 ngày", "Hôm qua", "3 ngày trước".
  const dayKey = from ? toDateKey(from) : null;
  const date = dayKey ? `${t(`time.weekday.${String(weekdayOf(dayKey)) as '0'}`)}, ${formatKey(dayKey)}` : '';
  const days = dayKey ? diffDays(todayKey(now), dayKey) : null;
  const away =
    days === null
      ? null
      : days === 0
        ? t('meeting.today')
        : days === 1
          ? t('meeting.tomorrow')
          : days === -1
            ? t('meeting.yesterday')
            : days > 0
              ? t('meeting.inDays', { count: days })
              : t('meeting.daysAgo', { count: -days });

  return (
    <View testID="meeting-hero" className="gap-2.5">
      <View className="flex-row flex-wrap items-center gap-1.5">
        <HeaderPill testID="meeting-status" label={label} dotColor={dot} />
        {approved && phase === 'upcoming' ? <HeaderPill label={t('status.bookingPhase.upcoming')} /> : null}
        {tags.map((tag) => (
          <HeaderPill key={tag} label={tag} />
        ))}
      </View>

      <View className="flex-row items-start gap-2">
        {hidden ? <Icon icon={LockIcon} size={15} rawColor={text2} /> : null}
        <Text weight="bold" numberOfLines={3} accessibilityRole="header" className="flex-1" style={{ fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: hidden ? text2 : fg }}>
          {title}
        </Text>
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-end justify-between gap-3">
          <Text
            mono
            weight="bold"
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.1}
            className="flex-shrink"
            style={{ fontSize: 24, lineHeight: 29, letterSpacing: -0.3, color: struck ? text2 : fg, textDecorationLine: struck ? 'line-through' : 'none' }}
          >
            {`${formatTime(from)} – ${formatTime(to)}`}
          </Text>
          {side ? (
            <Text mono={live} weight="semibold" numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, paddingBottom: 3, color: live ? green : text2 }}>
              {side}
            </Text>
          ) : null}
        </View>
        {live ? <ProgressBar value={progress} color={green} height={4} onHeader /> : null}
        <View className="flex-row items-center gap-2">
          <Icon icon={CalendarDaysIcon} size={13} rawColor={text2} />
          <Text numberOfLines={1} className="flex-shrink" style={{ fontSize: 12.5, lineHeight: 17, color: fg }}>
            {date}
          </Text>
          {away ? (
            <View className="h-5 justify-center rounded-[6px] px-1.5" style={{ backgroundColor: onBlue(0.14) }}>
              <Text weight="semibold" numberOfLines={1} style={{ fontSize: 11, lineHeight: 13, color: fg }}>
                {away}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
