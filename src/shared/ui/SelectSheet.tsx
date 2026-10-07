import { Pressable, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import { CheckIcon } from './icons';
import { BottomSheet } from './BottomSheet';
import { Text } from './Text';

export type SelectOption<T> = { value: T; label: string; description?: string; disabled?: boolean };

type Props<T> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: SelectOption<T>[];
  value: T | undefined;
  onSelect: (value: T) => void;
  mono?: boolean;
  testID?: string;
};

/** Single-choice list inside a bottom sheet. Closes on selection. */
export function SelectSheet<T extends string | number>({ visible, onClose, title, options, value, onSelect, mono, testID }: Props<T>) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} scrollable testID={testID}>
      <View className="overflow-hidden rounded-[16px] border border-line">
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              testID={testID ? `${testID}-${index}` : undefined}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !!option.disabled }}
              disabled={option.disabled}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
              className={cn(
                'min-h-[52px] flex-row items-center gap-3 px-4 py-3 active:bg-line-2',
                index > 0 && 'border-t border-line-2',
                option.disabled && 'opacity-50',
              )}
            >
              <View className="flex-1 gap-0.5">
                <Text mono={mono} weight={selected ? 'semibold' : mono ? 'medium' : 'regular'} className="text-card">
                  {option.label}
                </Text>
                {option.description ? <Text className="text-meta text-muted">{option.description}</Text> : null}
              </View>
              {selected ? <Icon icon={CheckIcon} size={18} weight="bold" color="primary" /> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}
