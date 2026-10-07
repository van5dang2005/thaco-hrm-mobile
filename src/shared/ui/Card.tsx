import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

/** `highlight` = 1.5px primary (needs attention), `selected` = 2px primary (chosen). */
export function useCardStyle(highlight?: boolean, selected?: boolean): ViewStyle {
  const { colors } = useTheme();
  return {
    backgroundColor: colors.elevated,
    borderWidth: selected ? 2 : highlight ? 1.5 : 1,
    borderColor: selected || highlight ? colors.primary : colors.line,
  };
}

/** Lift for elements floating over others (toasts, ghost blocks). Cards themselves use a hairline, no shadow. */
export const floatShadow: ViewStyle = {
  boxShadow: '0px 2px 4px rgba(15, 27, 45, 0.05), 0px 12px 28px rgba(15, 27, 45, 0.12)',
};

type CardProps = ViewProps & {
  className?: string;
  children?: ReactNode;
  highlight?: boolean;
  selected?: boolean;
};

/** White card, radius 20, 1px #E3E8EF border (dark: #1A2A3E on #22324A). */
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
