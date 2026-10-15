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
  /** `md` 30pt buttons, 15pt value (default); `lg` 40pt buttons, 22pt value (the main control of a form). */
  size?: 'md' | 'lg';
  testID?: string;
  accessibilityLabel?: string;
};

const sizes = {
  md: { button: 'h-[30px] w-[30px]', icon: 13, value: 'min-w-[24px]', font: { fontSize: 15, lineHeight: 20 } },
  lg: { button: 'h-10 w-10', icon: 16, value: 'min-w-[36px]', font: { fontSize: 22, lineHeight: 28 } },
} as const;

/** − value + with round outlined buttons and a mono 600 value (3h, 4b). */
export function NumberStepper({ value, onChange, min = 1, max = 999, step = 1, warn, size = 'md', testID, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const s = sizes[size];
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
        className={cn(s.button, 'items-center justify-center rounded-full border border-input-border active:opacity-70', disabled && 'opacity-40')}
      >
        <Icon icon={kind === 'dec' ? MinusIcon : PlusIcon} size={s.icon} weight="bold" color="muted" />
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
      <Text mono weight="semibold" className={cn(s.value, 'text-center')} style={{ ...s.font, color: warn ? colors['warning-text'] : colors.ink }}>
        {value}
      </Text>
      {button('inc')}
    </View>
  );
}
