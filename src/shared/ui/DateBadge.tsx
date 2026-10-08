import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';

import { Text } from './Text';

type Props = {
  /** "T2", "CN". */
  weekday: string;
  /** "05". */
  day: string;
  /** "Th10". */
  month: string;
  testID?: string;
};

/**
 * Calendar-page badge (46 wide, radius 12): a 16pt blue band with the weekday, the day in mono 18/700, the month.
 * Keeps its own height (`self-start`) so a taller sibling column in a row does not stretch it into an empty box.
 */
export function DateBadge({ weekday, day, month, testID }: Props) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${weekday} ${day} ${month}`}
      className="w-[46px] flex-shrink-0 self-start overflow-hidden rounded-[12px] bg-elevated"
      style={{ borderWidth: 1, borderColor: colors.line }}
    >
      <View className="h-4 items-center justify-center bg-primary">
        <Text weight="bold" maxFontSizeMultiplier={1} className="text-on-primary" style={{ fontSize: 9.5, lineHeight: 12 }}>
          {weekday}
        </Text>
      </View>
      <View className="items-center pb-1 pt-0.5">
        <Text mono weight="bold" maxFontSizeMultiplier={1} className="text-ink" style={{ fontSize: 18, lineHeight: 22 }}>
          {day}
        </Text>
        <Text maxFontSizeMultiplier={1} className="text-subtle" style={{ fontSize: 9.5, lineHeight: 12 }}>
          {month}
        </Text>
      </View>
    </View>
  );
}
