import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';

import type { Busy } from '../utils/availability';

type Props = {
  busy: Busy[];
  open: number;
  close: number;
  /** Current time when the day is today: red 2pt marker. */
  nowMin?: number | null;
};

/** Day at a glance (4a): green track over opening hours, booked stretches in blue-grey. */
export function AvailabilityBar({ busy, open, close, nowMin }: Props) {
  const { colors } = useTheme();
  const span = Math.max(close - open, 60);
  const pct = (minute: number) => `${(Math.min(Math.max(minute - open, 0), span) / span) * 100}%` as const;

  const firstHour = Math.ceil(open / 60);
  const lastHour = Math.floor(close / 60);
  const step = lastHour - firstHour > 12 ? 3 : 2;
  const hours: number[] = [];
  for (let h = firstHour; h <= lastHour; h += step) hours.push(h);

  return (
    <View className="gap-[5px]" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View className="h-2.5 overflow-hidden rounded-[5px]" style={{ backgroundColor: colors['free-track'] }}>
        {busy.map((b, i) => (
          <View
            key={i}
            className="absolute bottom-0 top-0"
            style={{ left: pct(b.startMin), width: `${(Math.max(0, Math.min(b.endMin, close) - Math.max(b.startMin, open)) / span) * 100}%`, backgroundColor: colors.booked }}
          />
        ))}
        {nowMin != null && nowMin >= open && nowMin <= close ? (
          <View className="absolute bottom-0 top-0 w-0.5" style={{ left: pct(nowMin), backgroundColor: colors.danger }} />
        ) : null}
      </View>
      <View className="h-4">
        {hours.map((h, i) => (
          <Text
            key={h}
            mono
            numberOfLines={1}
            maxFontSizeMultiplier={1}
            className="absolute text-meta-sm text-subtle"
            style={{
              left: pct(h * 60),
              // First label sits on the left edge, the last on the right edge, the others centred.
              transform: [{ translateX: i === 0 ? 0 : h === lastHour && hours.length > 1 ? -16 : -8 }],
            }}
          >
            {String(h).padStart(2, '0')}
          </Text>
        ))}
      </View>
    </View>
  );
}
