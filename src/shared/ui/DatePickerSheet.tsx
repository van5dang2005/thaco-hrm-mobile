import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { addDays, parseDateKey, todayKey, type DateKey } from '@/core/time/vn';
import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import { CaretLeftIcon, CaretRightIcon } from './icons';
import { BottomSheet } from './BottomSheet';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: DateKey | undefined;
  onSelect: (value: DateKey) => void;
  minDate?: DateKey;
  maxDate?: DateKey;
  testID?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Month grid in Vietnam time, Monday first. Days outside [minDate, maxDate] are disabled. */
export function DatePickerSheet({ visible, onClose, title, value, onSelect, minDate, maxDate, testID }: Props) {
  const { t } = useTranslation();
  const initial = parseDateKey(value ?? todayKey());
  const [cursor, setCursor] = useState({ year: initial.year, month: initial.month });
  const [lastValue, setLastValue] = useState(value);

  // Re-center on the selected month whenever the sheet is reopened with another value.
  if (value !== lastValue) {
    setLastValue(value);
    if (value) {
      const p = parseDateKey(value);
      setCursor({ year: p.year, month: p.month });
    }
  }

  const first: DateKey = `${cursor.year}-${pad(cursor.month)}-01`;
  const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay();
  const offset = (firstWeekday + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
  const cells: (DateKey | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i)),
  ];
  while (cells.length % 7) cells.push(null);
  const today = todayKey();

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const m = month + delta;
      return m < 1 ? { year: year - 1, month: 12 } : m > 12 ? { year: year + 1, month: 1 } : { year, month: m };
    });

  const weekdayOrder = ['1', '2', '3', '4', '5', '6', '0'] as const;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} testID={testID}>
      <View className="flex-row items-center justify-between">
        <Pressable accessibilityRole="button" accessibilityLabel="previous month" onPress={() => shift(-1)} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-[10px] border border-line">
          <Icon icon={CaretLeftIcon} size={16} />
        </Pressable>
        <Text weight="semibold" className="text-card">
          {t('time.month', { month: cursor.month, year: cursor.year })}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="next month" onPress={() => shift(1)} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-[10px] border border-line">
          <Icon icon={CaretRightIcon} size={16} />
        </Pressable>
      </View>
      <View>
        <View className="flex-row">
          {weekdayOrder.map((d) => (
            <Text key={d} className="flex-1 py-1 text-center text-meta text-muted">
              {t(`time.weekdayShort.${d}`)}
            </Text>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} className="flex-row">
            {cells.slice(row * 7, row * 7 + 7).map((key, col) => {
              if (!key) return <View key={col} className="h-11 flex-1" />;
              const disabled = (minDate && key < minDate) || (maxDate && key > maxDate);
              const selected = key === value;
              const day = parseDateKey(key).day;
              return (
                <Pressable
                  key={key}
                  testID={testID ? `${testID}-${key}` : undefined}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: !!disabled }}
                  disabled={!!disabled}
                  onPress={() => {
                    onSelect(key);
                    onClose();
                  }}
                  className="h-11 flex-1 items-center justify-center"
                >
                  <View className={cn('h-9 w-9 items-center justify-center rounded-full', selected && 'bg-primary', !selected && key === today && 'border border-primary')}>
                    <Text
                      mono
                      weight={selected ? 'semibold' : 'medium'}
                      className={cn('text-body', selected ? 'text-on-primary' : disabled ? 'text-disabled-text' : col === 6 ? 'text-danger' : 'text-ink')}
                    >
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}
