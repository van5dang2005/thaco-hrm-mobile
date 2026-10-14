import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import type { AppIcon } from './icons';
import { shadows } from './shadows';
import { Text } from './Text';

export type ToggleOption<T extends string> = { value: T; label: string; icon?: AppIcon; testID?: string };

type Props<T extends string> = {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  testID?: string;
};

const PAD = 4;

/**
 * Switch on a white surface: grey track, a raised white thumb that slides to the chosen option
 * (icon + label in primary), a selection tick on change.
 */
export function SegmentedToggle<T extends string>({ options, value, onChange, className, testID }: Props<T>) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const segment = width ? (width - PAD * 2) / options.length : 0;
  const x = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    if (!segment) return;
    // Jump into place on the first layout, slide afterwards.
    x.set(placed.current ? withTiming(index * segment, { duration: 220, easing: Easing.out(Easing.cubic) }) : index * segment);
    placed.current = true;
  }, [index, segment, x]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className={cn('flex-row rounded-[14px] bg-field', className)}
      style={{ padding: PAD }}
    >
      {segment ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: PAD, bottom: PAD, left: PAD, width: segment, borderRadius: 11, backgroundColor: colors.surface },
            shadows.raised,
            thumbStyle,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            className="h-10 min-w-0 flex-1 flex-row items-center justify-center gap-1.5 px-2"
          >
            {option.icon ? <Icon icon={option.icon} size={16} color={active ? 'primary' : 'muted'} weight={active ? 'bold' : 'regular'} /> : null}
            <Text weight={active ? 'bold' : 'semibold'} numberOfLines={1} style={{ fontSize: 13.5, lineHeight: 18, color: active ? colors.primary : colors.muted }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
