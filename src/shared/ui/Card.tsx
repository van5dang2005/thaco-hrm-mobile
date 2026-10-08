import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { shadows } from './shadows';

/**
 * v3 card chrome: white, soft shadow, no border in light mode (a hairline in dark mode, where the
 * shadow does not show). `highlight` = 1.5px primary (needs attention), `selected` = 2px primary (chosen).
 */
export function useCardStyle(highlight?: boolean, selected?: boolean): ViewStyle {
  const { colors, scheme } = useTheme();
  const ring = selected ? 2 : highlight ? 1.5 : scheme === 'dark' ? 1 : 0;
  return {
    ...shadows.card,
    backgroundColor: colors.elevated,
    borderWidth: ring,
    borderColor: selected || highlight ? colors.primary : colors.line,
  };
}

/** Lift for elements floating over others (toasts, ghost blocks). */
export const floatShadow: ViewStyle = {
  boxShadow: '0px 2px 4px rgba(15, 27, 45, 0.05), 0px 12px 28px rgba(15, 27, 45, 0.12)',
};

type CardProps = ViewProps & {
  className?: string;
  children?: ReactNode;
  highlight?: boolean;
  selected?: boolean;
};

/** White card, radius 20, soft shadow. */
export function Card({ className, highlight, selected, children, style, ...rest }: CardProps) {
  const chrome = useCardStyle(highlight, selected);
  return (
    <View {...rest} className={cn('overflow-hidden rounded-card', className)} style={[chrome, style]}>
      {children}
    </View>
  );
}

type PressableCardProps = Omit<PressableProps, 'children' | 'style'> & {
  className?: string;
  highlight?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function PressableCard({ className, highlight, selected, children, style, ...rest }: PressableCardProps) {
  const chrome = useCardStyle(highlight, selected);
  return (
    <Pressable accessibilityRole="button" {...rest} className={cn('overflow-hidden rounded-card active:opacity-80', className)} style={[chrome, style]}>
      {children}
    </Pressable>
  );
}

/** 1px inner divider (#EEF2F6). `inset` is the left margin; rows with a 32pt icon use 58. */
export function Divider({ className, inset = 0 }: { className?: string; inset?: number }) {
  return <View className={cn('h-px bg-line-2', className)} style={{ marginLeft: inset }} />;
}

type FloatingCardProps = ViewProps & {
  className?: string;
  children?: ReactNode;
  /** 18 (default) for stat strips and tabs, 20 for larger blocks. */
  radius?: number;
};

/** White card that overlaps the bottom of the blue header (marginTop −26, 16 from the edges). */
export function FloatingCard({ className, radius = 18, children, style, ...rest }: FloatingCardProps) {
  const chrome = useCardStyle();
  return (
    <View {...rest} className={cn('mx-4', className)} style={[chrome, { marginTop: -26, borderRadius: radius }, style]}>
      {children}
    </View>
  );
}
