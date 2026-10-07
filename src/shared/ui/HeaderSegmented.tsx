import { Pressable, View } from 'react-native';

import { CountBadge } from './CountBadge';
import { onBlue, useHeaderColors } from './ScreenShell';
import { Text } from './Text';

export type HeaderSegmentOption<T extends string> = { value: T; label: string; badge?: number; testID?: string };

type Props<T extends string> = {
  options: HeaderSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
};

/** Switch on the blue header: white 12% track (radius 14, padding 4), white selected segment (36pt, radius 10). */
export function HeaderSegmented<T extends string>({ options, value, onChange, testID }: Props<T>) {
  const { bg, fg } = useHeaderColors();
  return (
    <View testID={testID} accessibilityRole="tablist" className="mx-1 mt-3.5 flex-row rounded-[14px] p-1" style={{ backgroundColor: onBlue(0.12) }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.badge ? `${option.label}, ${option.badge}` : option.label}
            onPress={() => onChange(option.value)}
            className="min-h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] px-2 active:opacity-80"
            style={{ backgroundColor: active ? fg : 'transparent' }}
          >
            <Text weight={active ? 'bold' : 'medium'} numberOfLines={1} className="flex-shrink" style={{ fontSize: 13.5, lineHeight: 18, color: active ? bg : fg }}>
              {option.label}
            </Text>
            {option.badge ? <CountBadge count={option.badge} tone="danger" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
