import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';

import { onBlue } from './ScreenShell';

type Props = {
  /** 0…1 */
  value: number;
  color: string;
  /** 6 in cards, 8 on header panels. */
  height?: number;
  /** White 20% track for bars on the blue header. */
  onHeader?: boolean;
  /** Round knob at the current position (parcel lifecycle). */
  knob?: boolean;
  testID?: string;
};

/** Thin progress bar, radius half its height, #EEF2F6 track. */
export function ProgressBar({ value, color, height = 6, onHeader, knob, testID }: Props) {
  const { colors } = useTheme();
  const ratio = Math.min(1, Math.max(0, value));
  const radius = height / 2;
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={{ height, borderRadius: radius, backgroundColor: onHeader ? onBlue(0.2) : colors['line-2'] }}
    >
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${ratio * 100}%`, borderRadius: radius, backgroundColor: color }} />
      {knob ? (
        <View
          style={{
            position: 'absolute',
            top: (height - 18) / 2,
            left: `${ratio * 100}%`,
            marginLeft: -9,
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 4,
            borderColor: color,
            backgroundColor: '#FFFFFF',
          }}
        />
      ) : null}
    </View>
  );
}
