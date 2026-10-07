import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import { MinusIcon, PlusIcon } from './icons';
import { Text } from './Text';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Value in warning color (e.g. more people than seats). */
  warn?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

/** − value + with 30pt round outlined buttons and a mono 15/600 value (3h, 4b). */
export function NumberStepper({ value, onChange, min = 1, max = 999, step = 1, warn, testID, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const button = (kind: 'dec' | 'inc') => {
    const disabled = kind === 'dec' ? value <= min : value >= max;
    return (
      <Pressable
        testID={testID ? `${testID}-${kind}` : undefined}
        accessibilityLabel={kind}
        onPress={kind === 'dec' ? dec : inc}
        disabled={disabled}
        hitSlop={8}
        className={cn('h-[30px] w-[30px] items-center justify-center rounded-full border border-input-border active:opacity-70', disabled && 'opacity-40')}
      >
        <Icon icon={kind === 'dec' ? MinusIcon : PlusIcon} size={13} weight="bold" color="muted" />
      </Pressable>
    );
  };
  return (
    <View
      className="flex-row items-center gap-2.5"
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => (event.nativeEvent.actionName === 'increment' ? inc() : dec())}
    >
      {button('dec')}
      <Text mono weight="semibold" className="min-w-[24px] text-center" style={{ fontSize: 15, lineHeight: 20, color: warn ? colors['warning-text'] : colors.ink }}>
        {value}
      </Text>
      {button('inc')}
    </View>
  );
}
