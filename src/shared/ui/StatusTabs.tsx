import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { Text } from './Text';
import { useToneColors, type Tone } from './tones';

export type StatusTabItem<K extends string> = {
  key: K;
  label: string;
  count?: number;
  tone: Tone;
  /** Count in the tone's solid color even when not selected (Quá hạn is always red). */
  alarm?: boolean;
  testID?: string;
};

type Props<K extends string> = {
  items: StatusTabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
  testID?: string;
};

/**
 * Status filter as a 4-column grid (design 6d), usually inside a `FloatingCard` (padding 5): each tab
 * is 60 tall, radius 13, count in mono 19/700 over a 6px dot + 11.5/600 label. The selected tab gets
 * the tone's tint, a 1.5px tone border and tone-colored text.
 */
export function StatusTabs<K extends string>({ items, value, onChange, className, testID }: Props<K>) {
  return (
    <View testID={testID} accessibilityRole="tablist" className={cn('flex-row gap-1 p-[5px]', className)}>
      {items.map((item) => (
        <StatusTab key={item.key} item={item} selected={item.key === value} onPress={() => onChange(item.key)} />
      ))}
    </View>
  );
}

function StatusTab<K extends string>({ item, selected, onPress }: { item: StatusTabItem<K>; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const tone = useToneColors(item.tone);
  // "Đã hủy" reads better in ink-2 than in the grey off text once selected.
  const selectedText = item.tone === 'off' ? colors['ink-2'] : tone.text;
  const countColor = selected ? selectedText : item.alarm ? tone.solid : colors.ink;
  return (
    <Pressable
      testID={item.testID}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={item.count === undefined ? item.label : `${item.label}, ${item.count}`}
      onPress={onPress}
      className="h-[60px] min-w-0 flex-1 items-center justify-center gap-0.5 rounded-[13px] active:opacity-80"
      style={{ backgroundColor: selected ? tone.tint : 'transparent', borderWidth: 1.5, borderColor: selected ? tone.border : 'transparent' }}
    >
      <Text mono weight="bold" maxFontSizeMultiplier={1.15} style={{ fontSize: 19, lineHeight: 23, color: countColor }}>
        {item.count === undefined ? '–' : String(item.count)}
      </Text>
      <View className="max-w-full flex-row items-center gap-1 px-1">
        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.solid }} />
        <Text weight="semibold" numberOfLines={1} maxFontSizeMultiplier={1.15} className="flex-shrink" style={{ fontSize: 11.5, lineHeight: 15, color: selected ? selectedText : colors.muted }}>
          {item.label}
        </Text>
      </View>
    </Pressable>
  );
}
