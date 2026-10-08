import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import type { ColorToken } from '@/core/theme/palette';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import { type AppIcon, ChevronRightIcon } from './icons';
import { shadows } from './shadows';
import { Text } from './Text';

/**
 * primary (blue, shadow) · success (green, shadow) · danger-outline (white, 1.5 #F0C6C2 outline, red
 * text; `danger` is the same) · danger-soft (#FBE7E5 fill, red text, no outline) · ghost (white, grey outline) · soft (#EEF3F9, primary text) ·
 * neutral (#F4F7FB, ink text) · link (text only, trailing ›) · inverse / inverse-soft (on dark or blue surfaces).
 */
export type ButtonVariant = 'primary' | 'success' | 'danger-outline' | 'danger' | 'danger-soft' | 'ghost' | 'neutral' | 'soft' | 'link' | 'inverse' | 'inverse-soft';

/** `xl` 56 / radius 14 (main CTA) · `lg` 52 / radius 14 (footers, forms) · `md` 44 / radius 12 (inside cards) · `sm` 40 · `xs` 34 pill. */
export type ButtonSize = 'xl' | 'lg' | 'md' | 'sm' | 'xs';

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

const variants: Record<ButtonVariant, { box: string; fg: ColorToken | 'white'; shadow?: keyof typeof shadows }> = {
  primary: { box: 'bg-primary', fg: 'on-primary', shadow: 'primary' },
  success: { box: 'bg-success', fg: 'white', shadow: 'success' },
  'danger-outline': { box: 'border-[1.5px] border-danger-border bg-elevated', fg: 'danger' },
  danger: { box: 'border-[1.5px] border-danger-border bg-elevated', fg: 'danger' },
  'danger-soft': { box: 'bg-danger-tint', fg: 'danger-text' },
  ghost: { box: 'border border-input-border bg-elevated', fg: 'ink' },
  neutral: { box: 'bg-panel', fg: 'ink' },
  soft: { box: 'bg-icon-ring', fg: 'primary-tint-text' },
  link: { box: 'bg-transparent px-0', fg: 'primary' },
  inverse: { box: 'bg-white', fg: 'ink' },
  'inverse-soft': { box: 'bg-white/10', fg: 'white' },
};

const sizes: Record<ButtonSize, { box: string; radius: string; font: number; line: number; icon: number; weight: 'semibold' | 'bold' }> = {
  xl: { box: 'h-14 px-5', radius: 'rounded-button', font: 15, line: 20, icon: 18, weight: 'bold' },
  lg: { box: 'h-[52px] px-5', radius: 'rounded-button', font: 15, line: 20, icon: 18, weight: 'bold' },
  md: { box: 'h-11 px-3.5', radius: 'rounded-[12px]', font: 13, line: 17, icon: 16, weight: 'bold' },
  sm: { box: 'h-10 px-3.5', radius: 'rounded-[12px]', font: 13, line: 17, icon: 15, weight: 'semibold' },
  xs: { box: 'h-[34px] px-3', radius: 'rounded-full', font: 12.5, line: 16, icon: 14, weight: 'semibold' },
};

export function Button({ label, variant = 'primary', size = 'lg', icon, loading = false, disabled, pill, className, textClassName, trailing, style, ...rest }: Props) {
  const { colors, scheme } = useTheme();
  const v = variants[variant];
  const s = sizes[size];
  const fg = v.fg === 'white' ? '#FFFFFF' : variant === 'inverse' ? '#0F1B2D' : colors[v.fg];
  const inactive = disabled || loading;
  const isLink = variant === 'link';
  // Colored shadows only on the larger, enabled buttons in light mode.
  const lift = v.shadow && !inactive && scheme === 'light' && size !== 'xs' && size !== 'sm' ? shadows[v.shadow] : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      hitSlop={size === 'lg' || size === 'xl' ? undefined : 4}
      {...rest}
      style={(state) => [lift, typeof style === 'function' ? style(state) : style]}
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
      <Text weight={isLink ? 'semibold' : s.weight} numberOfLines={1} className={cn('flex-shrink', textClassName)} style={{ fontSize: s.font, lineHeight: s.line, color: fg }}>
        {label}
      </Text>
      {trailing ? <View>{trailing}</View> : isLink ? <Icon icon={ChevronRightIcon} size={15} weight="bold" rawColor={fg} /> : null}
    </Pressable>
  );
}
