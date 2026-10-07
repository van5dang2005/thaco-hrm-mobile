import { Platform, Pressable, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

import { CountBadge } from './CountBadge';
import { Text } from './Text';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  badge?: number;
  /** Badge color; pending counts use primary, attention counts danger. */
  badgeTone?: 'primary' | 'danger';
  testID?: string;
};

type Props<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** `tabs` = Material 3 underline tabs; defaults to tabs on Android when used in a header. */
  appearance?: 'segmented' | 'tabs';
};

export function Segmented<T extends string>({ options, value, onChange, className, appearance }: Props<T>) {
  const mode = appearance ?? 'segmented';

  if (mode === 'tabs') {
    return (
      <View className={cn('flex-row border-b border-line', className)} accessibilityRole="tablist">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              testID={option.testID}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option.value)}
              className={cn('h-12 flex-1 flex-row items-center justify-center gap-1.5', active && 'border-b-[3px] border-primary')}
            >
              <Text weight={active ? 'semibold' : 'regular'} className={cn('text-body', active ? 'text-primary' : 'text-muted')}>
                {option.label}
              </Text>
              {option.badge ? <CountBadge count={option.badge} size="md" tone={option.badgeTone ?? 'danger'} /> : null}
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View className={cn('flex-row rounded-field bg-line p-[3px]', className)} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            className={cn('min-h-[34px] flex-1 flex-row items-center justify-center gap-1.5 rounded-[9px] px-1', active && 'bg-surface')}
            style={active ? segmentShadow : undefined}
          >
            <Text
              weight={active ? 'semibold' : 'regular'}
              numberOfLines={1}
              className={cn('text-sub', active ? 'text-ink' : 'text-muted')}
            >
              {option.label}
            </Text>
            {option.badge ? <CountBadge count={option.badge} size="md" tone={option.badgeTone ?? 'primary'} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const segmentShadow = Platform.select({
  ios: { shadowColor: '#0F1B2D', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  android: { elevation: 1 },
  default: {},
});
