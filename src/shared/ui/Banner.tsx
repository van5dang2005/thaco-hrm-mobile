import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { ColorToken } from '@/core/theme/palette';
import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import { type AppIcon, CheckCircleIcon, InfoIcon, WarningCircleIcon } from './icons';
import { Text } from './Text';

type Tone = 'danger' | 'success' | 'warning' | 'off' | 'info';

const styles: Record<Tone, { box: string; text: string; icon: ColorToken; glyph: AppIcon }> = {
  danger: { box: 'bg-danger-tint', text: 'text-danger-deep', icon: 'danger', glyph: WarningCircleIcon },
  success: { box: 'bg-success-tint', text: 'text-success-deep', icon: 'success', glyph: CheckCircleIcon },
  warning: { box: 'bg-warning-tint', text: 'text-warning-text', icon: 'warning', glyph: WarningCircleIcon },
  off: { box: 'bg-off-tint', text: 'text-ink-2', icon: 'muted', glyph: InfoIcon },
  info: { box: 'bg-primary-tint', text: 'text-primary-tint-deep', icon: 'primary-tint-text', glyph: InfoIcon },
};

type Props = {
  tone: Tone;
  children: ReactNode;
  icon?: AppIcon;
  className?: string;
  testID?: string;
};

/** Inline message box: errors above submit buttons, eligibility (3m), policy notes (3f). */
export function Banner({ tone, children, icon, className, testID }: Props) {
  const style = styles[tone];
  return (
    <View testID={testID} accessibilityLiveRegion="polite" className={cn('flex-row items-start gap-2.5 rounded-[16px] px-3.5 py-3', style.box, className)}>
      <View className="pt-0.5">
        <Icon icon={icon ?? style.glyph} size={17} weight="bold" color={style.icon} />
      </View>
      <View className="flex-1">
        {typeof children === 'string' ? <Text className={cn('text-sub leading-[19px]', style.text)}>{children}</Text> : children}
      </View>
    </View>
  );
}
