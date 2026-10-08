import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { Text } from './Text';

export type CardSegmentOption<T extends string> = { value: T; label: string; testID?: string };

type Props<T extends string> = {
  options: CardSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  testID?: string;
};

/** Segmented control on a white surface (5b, inside a FloatingCard): the selected segment is a 40pt primary pill. */
export function CardSegmented<T extends string>({ options, value, onChange, className, testID }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View testID={testID} accessibilityRole="tablist" className={cn('flex-row gap-1 p-1', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            className="h-10 min-w-0 flex-1 items-center justify-center rounded-[13px] px-2 active:opacity-80"
            style={{ backgroundColor: active ? colors.primary : 'transparent' }}
          >
            <Text weight={active ? 'bold' : 'semibold'} numberOfLines={1} style={{ fontSize: 13, lineHeight: 17, color: active ? colors['on-primary'] : colors.muted }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
