import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useProfile } from '@/core/session/useMe';
import { useTheme } from '@/core/theme/ThemeProvider';
import { formatDayMonth, formatTime, vnParts } from '@/core/time/vn';
import { useAreas, useDefaultAreaId } from '@/features/room-booking/hooks';
import { bookingFrom, bookingTo } from '@/features/room-booking/logic';
import { BookingStatus } from '@/features/room-booking/types';
import { useNow } from '@/shared/hooks/useNow';
import { cn } from '@/shared/lib/cn';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { CalendarBlankIcon, CaretRightIcon, MapPinIcon, PlusIcon } from '@/shared/ui/icons';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useBadgeColors } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import { useGroupTone } from './layouts/shared';
import type { HomeModule } from './modules';
import { pickNextMeeting, useTodayMeetings } from './signals';
import type { ModuleSignals } from './useModules';

type Props = {
  modules: HomeModule[];
  signals: ModuleSignals;
  onOpen: (module: HomeModule) => void;
};

/** Counters in the bottom row, shown only for modules the user can see. */
const statCells = [
  { moduleId: 'approve-rooms', labelKey: 'approvals' },
  { moduleId: 'parcels', labelKey: 'parcels' },
  { moduleId: 'delegations', labelKey: 'delegations' },
] as const;

/** Top of the home sheet: date and area, my live / next meeting today, then the counters that need me. */
export function TodayCard({ modules, signals, onOpen }: Props) {
  const stats = statCells.flatMap((cell) => {
    const module = modules.find((m) => m.id === cell.moduleId);
    return module ? [{ ...cell, module, signal: signals[module.id]?.badge }] : [];
  });
  const bookRoom = modules.find((m) => m.id === 'book-room');
  const roomVisible = modules.some((m) => m.permission?.service === 'room');

  return (
    <Card testID="home-today" className="mx-4 mt-4">
      <TodayHeader />
      {roomVisible ? <NextMeeting onBook={bookRoom ? () => onOpen(bookRoom) : undefined} /> : null}
      {stats.length ? (
        <View className="flex-row border-t border-line-2">
          {stats.map(({ moduleId, labelKey, module, signal }, index) => (
            <StatCell
              key={moduleId}
              module={module}
              label={labelKey}
              count={signal?.data}
              loading={!!signal?.isLoading}
              divider={index > 0}
              onPress={() => onOpen(module)}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** "Hôm nay · Thứ Tư, 07/10" and my area. */
function TodayHeader() {
  const { t } = useTranslation();
  const profile = useProfile();
  const areas = useAreas();
  const defaultAreaId = useDefaultAreaId();
  const now = useNow(60_000);

  const area = profile.roomUser?.departments?.flatMap((d) => d.areas ?? [])[0]?.name ?? areas.data?.find((a) => a.id === defaultAreaId)?.name;
  const date = `${t(`time.weekday.${String(vnParts(now).weekday) as '0'}`)}, ${formatDayMonth(now)}`;

  return (
    <View className="flex-row items-center gap-3 px-4 pt-3.5">
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} accessibilityRole="header" className="flex-1 text-sub text-muted">
        <Text weight="bold" className="text-card text-ink">
          {t('home.today.title')}
        </Text>
        {`  ${date}`}
      </Text>
      {area ? (
        <View
          accessible
          accessibilityLabel={`${t('home.area')}: ${area}`}
          className="h-7 max-w-[45%] flex-shrink flex-row items-center gap-1 rounded-full bg-field px-2.5"
        >
          <Icon icon={MapPinIcon} size={13} color="muted" />
          <Text numberOfLines={1} maxFontSizeMultiplier={1.15} className="flex-shrink text-meta text-ink-2">
            {area}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** My live or next meeting today: time block, status rail, title and a countdown. */
function NextMeeting({ onBook }: { onBook?: () => void }) {
  const { t } = useTranslation();
  const meetings = useTodayMeetings();
  const now = useNow();
  const span = useSpan();
  const next = pickNextMeeting(meetings.data, now);
  const booking = next?.booking;
  const waiting = booking?.status === BookingStatus.Waiting;
  const rail = useBadgeColors(next?.live ? 'live' : waiting ? 'warn' : 'wait');

  if (meetings.isLoading) {
    return (
      <View className="flex-row items-center gap-3 px-4 py-3.5">
        <Skeleton width={44} height={36} radius={10} />
        <View className="flex-1 gap-2">
          <Skeleton width="70%" height={14} />
          <Skeleton width="45%" height={11} />
        </View>
      </View>
    );
  }

  if (!next || !booking) {
    return (
      <View testID="home-next-meeting" className="flex-row items-center gap-3 px-4 py-3.5">
        <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-field">
          <Icon icon={CalendarBlankIcon} size={20} color="subtle" />
        </View>
        <Text className="flex-1 text-sub text-muted">{t('home.today.none')}</Text>
        {onBook ? (
          <Pressable
            testID="home-today-book"
            accessibilityRole="button"
            onPress={onBook}
            hitSlop={6}
            className="h-8 flex-row items-center gap-1 rounded-full bg-primary-tint px-3 active:opacity-70"
          >
            <Icon icon={PlusIcon} size={14} weight="bold" color="primary-tint-text" />
            <Text weight="semibold" className="text-meta text-primary-tint-text">
              {t('home.today.book')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const from = bookingFrom(booking);
  const to = bookingTo(booking);
  const title = booking.content?.trim() || t('home.today.untitled');
  const status = next.live
    ? t('home.today.liveFor', { time: span((to?.getTime() ?? 0) - now.getTime()) })
    : waiting
      ? t('status.booking.1')
      : t('home.today.startsIn', { time: span((from?.getTime() ?? 0) - now.getTime()) });
  const place = [booking.room?.name, status].filter(Boolean).join(' · ');

  return (
    <Pressable
      testID="home-next-meeting"
      accessibilityRole="button"
      accessibilityLabel={`${formatTime(from)}–${formatTime(to)}, ${title}, ${place}`}
      onPress={() => router.push({ pathname: '/rooms/bookings/[id]', params: { id: booking.id } })}
      className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-70"
    >
      <View className="w-[54px] items-center">
        <Text mono weight="bold" numberOfLines={1} maxFontSizeMultiplier={1.1} className="text-body text-ink">
          {formatTime(from)}
        </Text>
        <Text mono numberOfLines={1} maxFontSizeMultiplier={1.1} className="text-meta text-subtle">
          {formatTime(to)}
        </Text>
      </View>
      <View className="w-[3px] self-stretch rounded-full" style={{ backgroundColor: next.live ? rail.bg : rail.fg }} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text weight="semibold" numberOfLines={1} className="text-body text-ink">
          {title}
        </Text>
        <View className="flex-row items-center gap-1.5">
          {next.live ? <LiveDot color={rail.bg} /> : null}
          <Text numberOfLines={1} className={cn('flex-shrink text-meta', next.live ? 'text-success-text' : waiting ? 'text-warning-text' : 'text-muted')}>
            {place}
          </Text>
        </View>
        {next.later ? (
          <Text className="text-meta text-subtle" onPress={() => router.push('/calendar')} suppressHighlighting>
            {t('home.today.later', { count: next.later })}
          </Text>
        ) : null}
      </View>
      <Icon icon={CaretRightIcon} size={16} color="subtle" />
    </Pressable>
  );
}

/** "45 phút", "1 giờ 20 phút", "2 giờ"; never below one minute. */
function useSpan() {
  const { t } = useTranslation();
  return (ms: number) => {
    const minutes = Math.max(1, Math.ceil(ms / 60_000));
    if (minutes < 60) return t('time.minutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    return minutes % 60 ? t('time.hoursMinutes', { hours, minutes: minutes % 60 }) : t('time.hours', { count: hours });
  };
}

/** Breathing green dot next to "Đang diễn ra". */
function LiveDot({ color }: { color: string }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [pulse]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - pulse.get()), transform: [{ scale: 1 + pulse.get() }] }));
  return (
    <View className="h-2 w-2 items-center justify-center">
      <Animated.View className="absolute h-2 w-2 rounded-full" style={[{ backgroundColor: color }, halo]} />
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    </View>
  );
}

function StatCell({
  module,
  label,
  count,
  loading,
  divider,
  onPress,
}: {
  module: HomeModule;
  label: (typeof statCells)[number]['labelKey'];
  count?: number;
  loading: boolean;
  divider: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tone = useGroupTone(module.group);
  const text = t(`home.stats.${label}`);
  const active = !!count;

  return (
    <Pressable
      testID={`home-stat-${module.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${text}: ${count ?? 0}`}
      onPress={onPress}
      className={cn('flex-1 gap-1.5 px-3 py-3 active:opacity-70', divider && 'border-l border-line-2')}
    >
      <View className="flex-row items-center gap-2">
        <View className="h-7 w-7 items-center justify-center rounded-[9px]" style={{ backgroundColor: active ? tone.box : colors.field }}>
          <Icon icon={module.icon} size={15} rawColor={active ? tone.icon : colors.subtle} />
        </View>
        {loading ? (
          <Skeleton width={22} height={20} radius={6} />
        ) : (
          <Text mono weight="bold" maxFontSizeMultiplier={1.2} className={active ? 'text-ink' : 'text-subtle'} style={{ fontSize: 20, lineHeight: 24 }}>
            {count ?? '–'}
          </Text>
        )}
      </View>
      <Text numberOfLines={2} maxFontSizeMultiplier={1.2} className="text-meta text-muted">
        {text}
      </Text>
    </Pressable>
  );
}
