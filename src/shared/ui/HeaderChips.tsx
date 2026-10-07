import { Pressable, ScrollView } from 'react-native';

import { onBlue, useHeaderColors } from './ScreenShell';
import { Text } from './Text';

export type HeaderChipOption<T extends string> = { value: T; label: string; testID?: string };

type Props<T extends string> = {
  options: HeaderChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
};

/** Horizontally scrolling tab chips on the blue header: selected white with primary text, others white 12%. */
export function HeaderChips<T extends string>({ options, value, onChange, testID }: Props<T>) {
  const { bg, fg } = useHeaderColors();
  return (
    <ScrollView
      testID={testID}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      className="-mx-3 mt-3.5 flex-grow-0"
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            hitSlop={{ top: 5, bottom: 5 }}
            className="h-[34px] items-center justify-center rounded-full px-3.5 active:opacity-80"
            style={{ backgroundColor: active ? fg : onBlue(0.12) }}
          >
            <Text weight="semibold" numberOfLines={1} style={{ fontSize: 13, lineHeight: 17, color: active ? bg : fg }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
