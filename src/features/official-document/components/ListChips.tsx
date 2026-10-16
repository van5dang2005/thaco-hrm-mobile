import { Pressable, ScrollView } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';

export type ListChipOption<T extends string> = { value: T; label: string; count?: number; testID?: string };

/**
 * Filter chips on the light canvas, under a header that ends in tabs, scrolling sideways: the selected
 * chip is primary tint with a primary outline, the others white with a hairline; each shows its count.
 */
export function ListChips<T extends string>({ options, value, onChange, testID }: { options: ListChipOption<T>[]; value: T; onChange: (value: T) => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      testID={testID}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      className="flex-grow-0"
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 12 }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.count === undefined ? option.label : `${option.label}, ${option.count}`}
            onPress={() => onChange(option.value)}
            hitSlop={{ top: 6, bottom: 6 }}
            className="h-8 flex-row items-center gap-1.5 rounded-full px-3.5 active:opacity-80"
            style={{ backgroundColor: active ? colors['primary-tint'] : colors.elevated, borderWidth: 1, borderColor: active ? colors.primary : colors['input-border'] }}
          >
            <Text weight={active ? 'bold' : 'medium'} numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ fontSize: 13, lineHeight: 17, color: active ? colors['primary-tint-text'] : colors['ink-2'] }}>
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <Text weight="bold" numeric maxFontSizeMultiplier={1.2} style={{ fontSize: 12, lineHeight: 15, color: active ? colors['primary-tint-text'] : colors.subtle }}>
                {String(option.count)}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
