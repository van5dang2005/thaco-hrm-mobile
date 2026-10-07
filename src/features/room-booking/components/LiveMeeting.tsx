import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatMinutes, formatTime } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { cn } from '@/shared/lib/cn';
import { Card } from '@/shared/ui/Card';
import { HeaderPanel } from '@/shared/ui/HeaderPanel';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { useHeaderColors } from '@/shared/ui/ScreenShell';
import { SectionTitle } from '@/shared/ui/SectionTitle';
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

/** "Còn lại 25 phút" panel with a white progress bar, on the blue header of 6c. */
export function CountdownPanel({ booking }: { booking: BookingDto }) {
  const { t } = useTranslation();
  const { fg, sub } = useHeaderColors();
  const now = useNow(15_000);
  const c = countdown(booking, now);
  if (!c) return null;
  const label = c.phase === 'upcoming' ? t('meeting.startsIn') : c.phase === 'live' ? t('meeting.remaining') : t('meeting.endedAgo');
  const value = c.minutes >= 60 ? t('meeting.hoursMinutes', { hours: Math.floor(c.minutes / 60), minutes: c.minutes % 60 }) : t('meeting.minutes', { count: c.minutes });
  return (
    <HeaderPanel testID="live-meeting-panel" className="gap-3 rounded-[20px] p-4">
      <View className="flex-row items-end justify-between gap-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text style={{ fontSize: 12, lineHeight: 16, color: sub }}>{label}</Text>
          <Text mono weight="semibold" numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontSize: 32, lineHeight: 38, color: fg }}>
            {value}
          </Text>
        </View>
        <Text mono weight="medium" numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontSize: 13, lineHeight: 17, color: sub }}>
          {`${formatTime(c.from)} – ${formatTime(c.to)}`}
        </Text>
      </View>
      <ProgressBar value={c.progress} color="#FFFFFF" height={8} onHeader />
    </HeaderPanel>
  );
}

/** "Gia hạn đến" card: new end-time chips of the same day; taken ones are struck out and disabled. */
export function ExtendCard({ options, value, onChange }: { options: ExtendOption[]; value?: number; onChange: (minutes: number) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const taken = options.filter((o) => o.taken).map((o) => formatMinutes(o.minutes));
  return (
    <Card className="gap-3 p-4" testID="extend-card">
      <SectionTitle right={t('meeting.sameDayOnly')}>{t('meeting.extendTo')}</SectionTitle>
      {options.length ? (
        <View className="flex-row gap-2">
          {options.map((option) => {
            const selected = value === option.minutes && !option.taken;
            return (
              <Pressable
                key={option.minutes}
                testID={`extend-${formatMinutes(option.minutes)}`}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: option.taken }}
                disabled={option.taken}
                onPress={() => onChange(option.minutes)}
                className={cn('h-[42px] flex-1 items-center justify-center rounded-[12px] active:opacity-80', !selected && !option.taken && 'border border-input-border')}
                style={{ backgroundColor: selected ? colors.primary : option.taken ? colors.disabled : colors.elevated }}
              >
                <Text
                  mono
                  weight="semibold"
                  maxFontSizeMultiplier={1.15}
                  style={{
                    fontSize: 13.5,
                    lineHeight: 18,
                    color: selected ? colors['on-primary'] : option.taken ? colors['disabled-text'] : colors.ink,
                    textDecorationLine: option.taken ? 'line-through' : 'none',
                  }}
                >
                  {formatMinutes(option.minutes)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Text className="text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
        {!options.length ? t('meeting.extendNone') : taken.length ? t('meeting.extendTaken', { times: taken.join(', ') }) : t('meeting.extendNote')}
      </Text>
    </Card>
  );
}
