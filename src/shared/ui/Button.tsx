import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import type { ColorToken } from '@/core/theme/palette';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import type { AppIcon } from './icons';
import { Text } from './Text';

/**
 * primary (blue) · success (green) · danger (white, red outline) · ghost (white, grey outline) ·
 * soft (#EEF3F9, primary text) · link (text only) · inverse / inverse-soft (on the dark selection bar).
 */
export type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost' | 'soft' | 'link' | 'inverse' | 'inverse-soft';

/** `lg` 50pt / radius 14 / 15 (footers, forms) · `sm` 40pt / radius 12 / 13 (inside cards) · `xs` 34pt pill. */
export type ButtonSize = 'lg' | 'sm' | 'xs';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: AppIcon;
  loading?: boolean;
  /** Fully rounded ends. */
  pill?: boolean;
  className?: string;
  textClassName?: string;
  trailing?: ReactNode;
};

const variants: Record<ButtonVariant, { box: string; fg: ColorToken | 'white' }> = {
  primary: { box: 'bg-primary', fg: 'on-primary' },
  success: { box: 'bg-success', fg: 'white' },
  danger: { box: 'border border-danger-border bg-elevated', fg: 'danger' },
  ghost: { box: 'border border-input-border bg-elevated', fg: 'ink' },
  soft: { box: 'bg-icon-ring', fg: 'primary-tint-text' },
  link: { box: 'bg-transparent', fg: 'primary' },
  inverse: { box: 'bg-white', fg: 'ink' },
  'inverse-soft': { box: 'bg-white/10', fg: 'white' },
};

const sizes: Record<ButtonSize, { box: string; radius: string; font: number; line: number; icon: number }> = {
  lg: { box: 'h-[50px] px-5', radius: 'rounded-button', font: 15, line: 20, icon: 18 },
  sm: { box: 'h-10 px-3.5', radius: 'rounded-[12px]', font: 13, line: 17, icon: 15 },
  xs: { box: 'h-[34px] px-3', radius: 'rounded-full', font: 12.5, line: 16, icon: 14 },
};

export function Button({ label, variant = 'primary', size = 'lg', icon, loading = false, disabled, pill, className, textClassName, trailing, ...rest }: Props) {
  const { colors } = useTheme();
  const v = variants[variant];
  const s = sizes[size];
  const fg = v.fg === 'white' ? '#FFFFFF' : variant === 'inverse' ? '#0F1B2D' : colors[v.fg];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      hitSlop={size === 'lg' ? undefined : 4}
      {...rest}
      className={cn(
        'flex-row items-center justify-center gap-2',
        s.box,
        pill ? 'rounded-full' : s.radius,
        v.box,
        inactive ? 'opacity-50' : 'active:opacity-80',
        className,
      )}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon icon={icon} size={s.icon} weight="bold" rawColor={fg} /> : null}
      <Text weight="semibold" numberOfLines={1} className={cn('flex-shrink', textClassName)} style={{ fontSize: s.font, lineHeight: s.line, color: fg }}>
        {label}
      </Text>
      {trailing ? <View>{trailing}</View> : null}
    </Pressable>
  );
}
