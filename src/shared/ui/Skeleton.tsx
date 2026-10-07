import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/core/theme/ThemeProvider';

import { Card } from './Card';

type Props = { width?: DimensionValue; height?: number; radius?: number };

export function Skeleton({ width = '100%', height = 14, radius = 6 }: Props) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.set(withRepeat(withTiming(1, { duration: 750 }), -1, true));
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors['line-2'] }, style]} />;
}

/** Placeholder matching a list card (code line, title, meta, bar). */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card className="mb-3 gap-2.5 p-4">
      <View className="flex-row justify-between">
        <Skeleton width={140} height={12} />
        <Skeleton width={72} height={18} />
      </View>
      <Skeleton width="70%" height={16} />
      {lines > 2 ? <Skeleton width="45%" height={12} /> : null}
      {lines > 3 ? <Skeleton width="100%" height={6} radius={3} /> : null}
    </Card>
  );
}

export function ListSkeleton({ count = 4, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <View accessibilityLabel="loading">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} lines={lines} />
      ))}
    </View>
  );
}
