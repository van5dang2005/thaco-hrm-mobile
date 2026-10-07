import { useEffect, useRef } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { formatMinutes } from '@/core/time/vn';
import { cn } from '@/shared/lib/cn';

import { BottomSheet } from './BottomSheet';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: number;
  onSelect: (minutes: number) => void;
  /** Inclusive bounds in minutes since midnight. */
  min: number;
  max: number;
  step?: number;
  disabled?: (minutes: number) => boolean;
  testID?: string;
};

const ROW = 48;
const COLS = 4;

/** Grid of HH:mm slots (default 15-minute steps, design 3b). */
export function TimeSlotSheet({ visible, onClose, title, value, onSelect, min, max, step = 15, disabled, testID }: Props) {
  const slots: number[] = [];
  for (let m = min; m <= max; m += step) slots.push(m);
  const rows: number[][] = [];
  for (let i = 0; i < slots.length; i += COLS) rows.push(slots.slice(i, i + COLS));
  const listRef = useRef<FlatList<number[]>>(null);
  const selectedRow = Math.max(0, rows.findIndex((row) => row.includes(value)));

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => listRef.current?.scrollToOffset({ offset: Math.max(0, (selectedRow - 2) * ROW), animated: false }), 50);
    return () => clearTimeout(timer);
  }, [visible, selectedRow]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} testID={testID} maxHeightRatio={0.6}>
      <FlatList
        ref={listRef}
        data={rows}
        style={{ maxHeight: ROW * 6 }}
        keyExtractor={(row) => String(row[0])}
        getItemLayout={(_, index) => ({ length: ROW, offset: ROW * index, index })}
        renderItem={({ item: row }) => (
          <View className="flex-row gap-2" style={{ height: ROW, paddingVertical: 4 }}>
            {row.map((minutes) => {
              const isDisabled = disabled?.(minutes) ?? false;
              const selected = minutes === value;
              return (
                <Pressable
                  key={minutes}
                  testID={testID ? `${testID}-${formatMinutes(minutes)}` : undefined}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: isDisabled }}
                  disabled={isDisabled}
                  onPress={() => {
                    onSelect(minutes);
                    onClose();
                  }}
                  className={cn(
                    'flex-1 items-center justify-center rounded-[10px]',
                    selected ? 'border-[1.5px] border-primary bg-primary-tint' : isDisabled ? 'bg-disabled' : 'border border-input-border',
                  )}
                >
                  <Text numeric weight={selected ? 'semibold' : 'medium'} className={cn('text-sub', selected ? 'text-primary-tint-text' : isDisabled ? 'text-disabled-text' : 'text-ink')}>
                    {formatMinutes(minutes)}
                  </Text>
                </Pressable>
              );
            })}
            {Array.from({ length: COLS - row.length }, (_, i) => (
              <View key={`pad-${i}`} className="flex-1" />
            ))}
          </View>
        )}
      />
    </BottomSheet>
  );
}
