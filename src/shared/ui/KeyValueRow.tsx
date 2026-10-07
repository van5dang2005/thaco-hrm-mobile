import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/shared/lib/cn';

import { Text } from './Text';

type Props = {
  label: string;
  value: ReactNode;
  mono?: boolean;
  /** Hairline above the row (rows inside one card). */
  divider?: boolean;
  /** Tighter rows without padding (booking ticket, summaries). */
  compact?: boolean;
  testID?: string;
};

/** "Nhãn ……… giá trị": 13.5 muted label on the left, 500 value on the right (6e). */
export function KeyValueRow({ label, value, mono, divider, compact, testID }: Props) {
  return (
    <View testID={testID} className={cn('flex-row items-start justify-between gap-3', !compact && 'px-3.5 py-3', divider && 'border-t border-line-2')}>
      <Text className="flex-shrink-0 text-muted" style={{ fontSize: 13.5, lineHeight: 19 }}>
        {label}
      </Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text mono={mono} weight="medium" numberOfLines={4} className="min-w-0 flex-1 text-right" style={{ fontSize: 13.5, lineHeight: 19 }}>
          {value}
        </Text>
      ) : (
        <View className="min-w-0 flex-1 items-end">{value}</View>
      )}
    </View>
  );
}
