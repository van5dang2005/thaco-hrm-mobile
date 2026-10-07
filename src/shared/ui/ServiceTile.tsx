import { Pressable, View } from 'react-native';

import type { ColorToken } from '@/core/theme/palette';
import { cn } from '@/shared/lib/cn';

import { CountBadge } from './CountBadge';
import { Icon } from './Icon';
import { type AppIcon, ArrowUpRightIcon, PlusIcon } from './icons';
import { Text } from './Text';

export type TileTone = 'primary' | 'success' | 'warning';

const toneBox: Record<TileTone, string> = {
  primary: 'bg-primary-tint',
  success: 'bg-success-tint',
  warning: 'bg-warning-tint',
};

const toneIcon: Record<TileTone, ColorToken> = {
  primary: 'primary-tint-text',
  success: 'success-text',
  warning: 'warning',
};

type Props = {
  label: string;
  subLabel?: string;
  icon: AppIcon;
  tone?: TileTone;
  badgeCount?: number;
  /** Opens another app: shows the ↗ marker instead of a count. */
  external?: boolean;
  /** Dashed placeholder tile ("Thêm"). */
  placeholder?: boolean;
  onPress?: () => void;
  testID?: string;
};

/** Home grid tile: 56×56 tinted icon box with a duotone icon + up to two lines of label. */
export function ServiceTile({ label, subLabel, icon, tone = 'primary', badgeCount, external, placeholder, onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={subLabel ? `${label}, ${subLabel}` : label}
      onPress={onPress}
      className="min-h-[88px] flex-1 items-center gap-[7px] active:opacity-70"
    >
      <View
        className={cn(
          'h-14 w-14 items-center justify-center rounded-[18px]',
          placeholder ? 'border-[1.5px] border-dashed border-line-strong' : toneBox[tone],
        )}
      >
        <Icon icon={placeholder ? PlusIcon : icon} size={placeholder ? 22 : 26} weight={placeholder ? 'regular' : 'duotone'} color={placeholder ? 'subtle' : toneIcon[tone]} />
        {external ? (
          <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-inverse">
            <Icon icon={ArrowUpRightIcon} size={10} weight="bold" color="on-inverse" />
          </View>
        ) : badgeCount ? (
          <CountBadge count={badgeCount} className="absolute -right-1 -top-1" ring="surface" />
        ) : null}
      </View>
      <Text weight="medium" numberOfLines={2} className={cn('text-center text-meta text-ink-2', placeholder && 'text-muted')}>
        {label}
        {subLabel ? (
          <Text className="text-meta-sm text-subtle">{`\n${subLabel}`}</Text>
        ) : null}
      </Text>
    </Pressable>
  );
}
