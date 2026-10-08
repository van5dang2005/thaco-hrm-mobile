import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/core/theme/ThemeProvider';

const WIDTH = 44;
const HEIGHT = 26;
const KNOB = 22;
const TRAVEL = WIDTH - KNOB - 4;

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
};

/**
 * v3 switch (7a): 44×26 track, #16865A on / #D6DDE6 off, 22pt white knob. The native Switch has a
 * fixed iOS size (51×31), hence this one. The touch target is padded to 44pt tall.
 */
export function Toggle({ value, onChange, disabled, accessibilityLabel, testID }: Props) {
  const { colors } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);
  const on = colors.success;
  const off = colors['input-border'];

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value, progress]);

  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(progress.value, [0, 1], [off, on]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * TRAVEL }] }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      hitSlop={{ top: 9, bottom: 9, left: 8, right: 8 }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[{ width: WIDTH, height: HEIGHT, borderRadius: HEIGHT / 2, padding: 2 }, track]}>
        <Animated.View
          style={[{ width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#FFFFFF', boxShadow: '0px 1px 3px rgba(15, 27, 45, 0.2)' }, knob]}
        />
      </Animated.View>
    </Pressable>
  );
}
