import { Fragment } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import type { AppIcon } from './icons';
import { useToneColors, type Tone } from './tones';
import { Text } from './Text';

export type StatItem = {
  key: string;
  icon: AppIcon;
  tone: Tone;
  value: string | number;
  label: string;
  /** Color the value with the tone's solid color (e.g. the current time in red). */
  emphasize?: boolean;
  onPress?: () => void;
  testID?: string;
};

/**
 * Three (or more) stats in a row, split by 1px #EEF2F6 lines: a 30pt tinted square icon (radius 9),
 * the value in mono 17/700 and an 11px muted label. Usually inside a `FloatingCard`.
 * `stacked`: icon, label, then a larger value, centered in each cell (dashboards whose labels run long).
 */
export function StatStrip({ items, stacked, className, testID }: { items: StatItem[]; stacked?: boolean; className?: string; testID?: string }) {
  return (
    <View testID={testID} className={cn('flex-row items-stretch px-1', stacked ? 'py-3.5' : 'py-2.5', className)}>
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 ? <View className="my-1 w-px bg-line-2" /> : null}
          {stacked ? <StackedCell item={item} /> : <StatCell item={item} />}
        </Fragment>
      ))}
    </View>
  );
}

function StackedCell({ item }: { item: StatItem }) {
  const tone = useToneColors(item.tone);
  return (
    <View testID={item.testID} accessible accessibilityLabel={`${item.label}: ${item.value}`} className="min-w-0 flex-1 items-center gap-1 px-1.5">
      <View className="mb-0.5 h-[34px] w-[34px] items-center justify-center rounded-[10px]" style={{ backgroundColor: tone.tint }}>
        <Icon icon={item.icon} size={18} rawColor={tone.solid} />
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
        {item.label}
      </Text>
      <Text mono weight="bold" numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: 22, lineHeight: 27, color: tone.solid }}>
        {String(item.value)}
      </Text>
    </View>
  );
}

function StatCell({ item }: { item: StatItem }) {
  const tone = useToneColors(item.tone);
  const content = (
    <>
      <View className="h-[30px] w-[30px] items-center justify-center rounded-[9px]" style={{ backgroundColor: tone.tint }}>
        <Icon icon={item.icon} size={16} rawColor={tone.solid} />
      </View>
      <View className="min-w-0 flex-shrink">
        <Text mono weight="bold" numberOfLines={1} maxFontSizeMultiplier={1.2} className={item.emphasize ? undefined : 'text-ink'} style={{ fontSize: 17, lineHeight: 21, color: item.emphasize ? tone.solid : undefined }}>
          {String(item.value)}
        </Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="text-muted" style={{ fontSize: 11, lineHeight: 14 }}>
          {item.label}
        </Text>
      </View>
    </>
  );
  const box = 'min-w-0 flex-1 flex-row items-center gap-2 px-2';
  return item.onPress ? (
    <Pressable testID={item.testID} accessibilityRole="button" accessibilityLabel={`${item.label}: ${item.value}`} onPress={item.onPress} className={cn(box, 'active:opacity-70')}>
      {content}
    </Pressable>
  ) : (
    <View testID={item.testID} accessible accessibilityLabel={`${item.label}: ${item.value}`} className={box}>
      {content}
    </View>
  );
}
