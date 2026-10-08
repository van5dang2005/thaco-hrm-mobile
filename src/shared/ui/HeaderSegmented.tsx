import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { CountBadge } from './CountBadge';
import { Icon } from './Icon';
import type { AppIcon } from './icons';
import { onBlue, useHeaderColors } from './ScreenShell';
import { shadows } from './shadows';
import { Text } from './Text';

export type HeaderSegmentOption<T extends string> = {
  value: T;
  label: string;
  badge?: number;
  /** `danger` (default) = red count; `neutral` = quiet count pill (totals such as "Đã xử lý 18"). */
  badgeTone?: 'danger' | 'neutral';
  /** `lg` segments: a second line ("2 đang hiệu lực") and a 32pt icon box. */
  sublabel?: string;
  icon?: AppIcon;
  testID?: string;
};

type Props<T extends string> = {
  options: HeaderSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `md` 38pt segments (default); `lg` two-line segments with an icon (design 6f / 6g). */
  size?: 'md' | 'lg';
  /** Outer spacing; defaults to the v2 placement under a HeaderBar. Pass '' inside a ModuleHeader. */
  className?: string;
  testID?: string;
};

/**
 * Switch on the blue header (v3): black 14% track (radius 14, padding 4); the selected segment is
 * white with a soft shadow and 700 primary text, the others #DCE8F4.
 */
export function HeaderSegmented<T extends string>({ options, value, onChange, size = 'md', className = 'mx-1 mt-3.5', testID }: Props<T>) {
  const large = size === 'lg';
  return (
    <View testID={testID} accessibilityRole="tablist" className={cn('flex-row gap-1 rounded-[14px] p-1', className)} style={{ backgroundColor: 'rgba(0, 0, 0, 0.14)' }}>
      {options.map((option) => (
        <Segment key={option.value} option={option} active={option.value === value} large={large} onPress={() => onChange(option.value)} />
      ))}
    </View>
  );
}

function Segment<T extends string>({ option, active, large, onPress }: { option: HeaderSegmentOption<T>; active: boolean; large: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const { fg, soft, text2 } = useHeaderColors();
  const labelColor = active ? colors.primary : large ? fg : soft;
  const badge = option.badge ? <SegmentBadge count={option.badge} tone={option.badgeTone ?? 'danger'} active={active} /> : null;

  return (
    <Pressable
      testID={option.testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={option.badge ? `${option.label}, ${option.badge}` : option.label}
      onPress={onPress}
      className={cn(
        'min-w-0 flex-1 flex-row items-center rounded-[10px] active:opacity-80',
        large ? 'min-h-[52px] gap-2.5 px-2.5 py-2' : 'min-h-[38px] justify-center gap-1.5 px-2',
      )}
      style={[{ backgroundColor: active ? fg : 'transparent' }, active ? shadows.raised : null]}
    >
      {large && option.icon ? (
        <View className="h-8 w-8 items-center justify-center rounded-[9px]" style={{ backgroundColor: active ? colors['primary-tint'] : onBlue(0.14) }}>
          <Icon icon={option.icon} size={16} rawColor={active ? colors.primary : fg} />
          {option.badge && option.badgeTone !== 'neutral' ? <CountBadge count={option.badge} ring={active ? 'header-name' : 'header'} className="absolute -right-2 -top-2" /> : null}
        </View>
      ) : null}
      <View className={cn('min-w-0 flex-shrink', large && 'flex-1')}>
        <Text weight="bold" numberOfLines={1} style={{ fontSize: 13.5, lineHeight: 18, color: labelColor }}>
          {option.label}
        </Text>
        {large && option.sublabel ? (
          <Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, color: active ? colors.muted : text2 }}>
            {option.sublabel}
          </Text>
        ) : null}
      </View>
      {!large || !option.icon ? badge : null}
    </Pressable>
  );
}

function SegmentBadge({ count, tone, active }: { count: number; tone: 'danger' | 'neutral'; active: boolean }) {
  const { colors } = useTheme();
  const { fg } = useHeaderColors();
  if (tone === 'danger') return <CountBadge count={count} size="md" />;
  return (
    <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5" style={{ backgroundColor: active ? colors['primary-tint'] : onBlue(0.18) }}>
      <Text mono weight="bold" maxFontSizeMultiplier={1} style={{ fontSize: 11, lineHeight: 14, color: active ? colors.primary : fg }}>
        {String(count)}
      </Text>
    </View>
  );
}
