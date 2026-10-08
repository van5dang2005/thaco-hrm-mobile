import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatMinutes, formatTime } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, DoorOpenIcon, TriangleAlertIcon, UsersIcon } from '@/shared/ui/icons';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { onBlue, useHeaderColors } from '@/shared/ui/ScreenShell';
import { Text } from '@/shared/ui/Text';

import { bookingFrom, bookingTo, type ExtendOption } from '../logic';
import type { BookingDto } from '../types';

/** Minutes to the start (upcoming), to the end (live) or since the end (extend window). */
export function countdown(booking: BookingDto, now: Date) {
  const from = bookingFrom(booking);
  const to = bookingTo(booking);
  if (!from || !to) return null;
  const upcoming = now < from;
  const live = now >= from && now < to;
  const target = upcoming ? from : to;
  const minutes = Math.max(0, Math.round(Math.abs(target.getTime() - now.getTime()) / 60_000));
  const progress = Math.min(1, Math.max(0, (now.getTime() - from.getTime()) / (to.getTime() - from.getTime())));
  return { phase: upcoming ? ('upcoming' as const) : live ? ('live' as const) : ('ended' as const), minutes, progress, from, to };
}

/**
 * Blue header of a meeting in progress (6c): "● Đang diễn ra", title, the time range in large mono
 * with "còn N phút", a green progress bar, then room and people.
 */
export function LiveHeader({ booking, title, roomLine, people }: { booking: BookingDto; title: string; roomLine: string; people: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fg, text2 } = useHeaderColors();
  const now = useNow(15_000);
  const c = countdown(booking, now);
  if (!c) return null;
  const green = colors['header-dot-live'];
  const phaseLabel = c.phase === 'live' ? t('status.bookingPhase.live') : c.phase === 'upcoming' ? t('meeting.startsIn') : t('meeting.endedAgo');
  const left = c.phase === 'live' ? t('meeting.leftMinutes', { count: c.minutes }) : c.phase === 'upcoming' ? t('meeting.minutes', { count: c.minutes }) : '';
  return (
    <View testID="live-meeting-panel" className="gap-2.5">
      <View className="h-6 flex-row items-center gap-1.5 self-start rounded-full px-2.5" style={{ backgroundColor: onBlue(0.14) }}>
        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: green }} />
        <Text weight="bold" style={{ fontSize: 11.5, lineHeight: 15, color: fg }}>
          {phaseLabel}
        </Text>
      </View>
      <Text weight="bold" numberOfLines={2} accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: fg }}>
        {title}
      </Text>
      <View className="flex-row items-end justify-between gap-3">
        <Text mono weight="bold" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1} style={{ fontSize: 30, lineHeight: 36, color: fg }}>
          {`${formatTime(c.from)} - ${formatTime(c.to)}`}
        </Text>
        {left ? (
          <Text mono weight="semibold" numberOfLines={1} style={{ fontSize: 12.5, lineHeight: 17, color: green, paddingBottom: 4 }}>
            {left}
          </Text>
        ) : null}
      </View>
      <ProgressBar value={c.progress} color={green} height={5} onHeader />
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-shrink flex-row items-center gap-1.5">
          <Icon icon={DoorOpenIcon} size={13} rawColor={text2} />
          <Text numberOfLines={1} className="flex-shrink" style={{ fontSize: 12.5, lineHeight: 16, color: text2 }}>
            {roomLine}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Icon icon={UsersIcon} size={13} rawColor={text2} />
          <Text numberOfLines={1} style={{ fontSize: 12.5, lineHeight: 16, color: text2 }}>
            {people}
          </Text>
        </View>
      </View>
    </View>
  );
}

type ExtendProps = {
  /** The three quick chips (+15′, +30′, +60′). */
  options: ExtendOption[];
  /** End minute of the meeting today (chips show "+N′" from it). */
  endMin: number;
  value?: number;
  onChange: (minutes: number) => void;
  /** "Khác": pick any quarter hour. A custom choice shows in that chip. */
  onOther: () => void;
  roomName: string;
  /** Room free until (minute of day), for the note under the chips. */
  freeUntil: number | null;
};

/** "Gia hạn cuộc họp · Chỉ trong hôm nay" (6c): +15′ / +30′ / +60′ / Khác, then whether the room is free. */
export function ExtendCard({ options, endMin, value, onChange, onOther, roomName, freeUntil }: ExtendProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const custom = value !== undefined && !options.some((o) => o.minutes === value);
  const fits = value !== undefined && freeUntil !== null && value <= freeUntil;
  return (
    <Card className="gap-3 p-4" testID="extend-card">
      <View className="flex-row items-center justify-between">
        <Text weight="bold" accessibilityRole="header" style={{ fontSize: 15, lineHeight: 20 }}>
          {t('meeting.extendTitle')}
        </Text>
        <Text className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
          {t('meeting.sameDay')}
        </Text>
      </View>
      <View className="flex-row gap-2">
        {options.map((option) => (
          <Chip
            key={option.minutes}
            testID={`extend-${formatMinutes(option.minutes)}`}
            top={`+${option.minutes - endMin}′`}
            bottom={formatMinutes(option.minutes)}
            selected={value === option.minutes && !option.taken}
            disabled={option.taken}
            onPress={() => onChange(option.minutes)}
          />
        ))}
        <Chip testID="extend-other" top="···" bottom={custom ? formatMinutes(value!) : t('meeting.other')} selected={custom} onPress={onOther} />
      </View>
      {value !== undefined ? (
        <View className="flex-row items-center gap-2 rounded-[12px] px-3 py-2.5" style={{ backgroundColor: fits ? colors['success-tint'] : colors['warning-tint'] }}>
          <Icon icon={fits ? CheckIcon : TriangleAlertIcon} size={14} weight="bold" rawColor={fits ? colors.success : colors.warning} />
          <Text className="flex-1" style={{ fontSize: 12.5, lineHeight: 17, color: fits ? colors['success-text'] : colors['warning-text'] }}>
            {fits || freeUntil === null ? t('meeting.freeUntil', { room: roomName, time: formatMinutes(freeUntil ?? value) }) : t('meeting.takenAt', { room: roomName, time: formatMinutes(freeUntil) })}
          </Text>
        </View>
      ) : (
        <Text className="text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
          {t('meeting.extendNone')}
        </Text>
      )}
    </Card>
  );
}

function Chip({ top, bottom, selected, disabled, onPress, testID }: { top: string; bottom: string; selected: boolean; disabled?: boolean; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  const fg = selected ? colors['on-primary'] : disabled ? colors['disabled-text'] : colors.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className="h-[54px] min-w-0 flex-1 items-center justify-center gap-0.5 rounded-[12px] active:opacity-80"
      style={{ backgroundColor: selected ? colors.primary : colors.panel }}
    >
      <Text mono weight="bold" maxFontSizeMultiplier={1.15} style={{ fontSize: 15, lineHeight: 19, color: fg, textDecorationLine: disabled ? 'line-through' : 'none' }}>
        {top}
      </Text>
      <Text mono maxFontSizeMultiplier={1.15} style={{ fontSize: 11, lineHeight: 14, color: selected ? colors['on-primary'] : colors.muted, opacity: selected ? 0.85 : 1, textDecorationLine: disabled ? 'line-through' : 'none' }}>
        {bottom}
      </Text>
    </Pressable>
  );
}
