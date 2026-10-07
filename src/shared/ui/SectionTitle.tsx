import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/shared/lib/cn';

import { Text } from './Text';

/** 15/600 section or card title, with an optional right-hand note / action. */
export function SectionTitle({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <View className={cn('flex-row items-baseline justify-between gap-2', className)}>
      <Text weight="semibold" accessibilityRole="header" numberOfLines={1} className="flex-shrink" style={{ fontSize: 15, lineHeight: 20 }}>
        {children}
      </Text>
      {typeof right === 'string' ? (
        <Text numberOfLines={1} className="flex-shrink text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
          {right}
        </Text>
      ) : (
        right
      )}
    </View>
  );
}

/** Day group heading of lists: UPPERCASE 12/700, letter-spacing .06em, muted. */
export function GroupTitle({ children, className }: { children: string; className?: string }) {
  return (
    <Text weight="bold" numberOfLines={1} accessibilityRole="header" className={cn('text-muted', className)} style={{ fontSize: 12, lineHeight: 16, letterSpacing: 0.72 }}>
      {children.toLocaleUpperCase()}
    </Text>
  );
}

/** Card-type label: UPPERCASE 11/700, letter-spacing .06em ("MẶC ĐỊNH · THEO THỜI GIAN"). */
export function Eyebrow({ children }: { children: string }) {
  return (
    <Text weight="bold" numberOfLines={1} className="flex-shrink text-muted" maxFontSizeMultiplier={1.2} style={{ fontSize: 11, lineHeight: 14, letterSpacing: 0.66 }}>
      {children.toLocaleUpperCase()}
    </Text>
  );
}
