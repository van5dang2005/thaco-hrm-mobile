import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { type ColorToken, withAlpha } from '@/core/theme/palette';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import { type AppIcon, ArrowUpRightIcon, CheckIcon } from './icons';
import { Skeleton } from './Skeleton';
import { Text } from './Text';
import type { Tone } from './tones';

export type StatusTabItem<K extends string> = {
  key: K;
  label: string;
  /** Status glyph on the tile's disc. */
  icon: AppIcon;
  count?: number;
  tone: Tone;
  testID?: string;
};

type Props<K extends string> = {
  /** Four tabs: the first is the large tile, the second the wide one, the last two share a row. */
  items: StatusTabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
  testID?: string;
};

type Variant = 'hero' | 'wide' | 'cell';

const ROW = 62;
const GAP = 8;

/** Per tone: tile tint, glyph, deep count color, and the fill of the selected tile. */
const palette: Record<Tone, { tint: ColorToken; glyph: ColorToken; deep: ColorToken; fill: ColorToken }> = {
  wait: { tint: 'primary-tint', glyph: 'primary', deep: 'primary-dark', fill: 'primary' },
  warn: { tint: 'warning-tint', glyph: 'warning', deep: 'warning-deep', fill: 'warning' },
  danger: { tint: 'danger-tint', glyph: 'danger', deep: 'danger-deep', fill: 'danger' },
  ok: { tint: 'success-tint', glyph: 'success', deep: 'success-deep', fill: 'success' },
  off: { tint: 'off-tint', glyph: 'muted', deep: 'ink-2', fill: 'off-text' },
};

/** White on dark fills, near-black on the lighter fills of dark mode. */
function textOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? '#0B1420' : '#FFFFFF';
}

/**
 * Status filter as a bento grid, usually inside a `FloatingCard`: the first status is a large tile on
 * the left, the second a wide tile on the right, the last two share the row under it. Every tile wears
 * its status tint; the selected one fills with the status color (white text, a check, a colored glow).
 */
export function StatusTabs<K extends string>({ items, value, onChange, className, testID }: Props<K>) {
  const tile = (item: StatusTabItem<K> | undefined, variant: Variant, style: ViewStyle) =>
    item ? (
      <StatusTile
        item={item}
        variant={variant}
        style={style}
        selected={item.key === value}
        onPress={() => {
          if (item.key === value) return;
          void Haptics.selectionAsync();
          onChange(item.key);
        }}
      />
    ) : null;

  return (
    <View testID={testID} accessibilityRole="tablist" className={cn('flex-row p-2', className)} style={{ gap: GAP }}>
      {tile(items[0], 'hero', { flex: 1.08 })}
      <View className="flex-1" style={{ gap: GAP }}>
        {tile(items[1], 'wide', { height: ROW })}
        <View className="flex-row" style={{ gap: GAP }}>
          {tile(items[2], 'cell', { flex: 1, height: ROW })}
          {tile(items[3], 'cell', { flex: 1, height: ROW })}
        </View>
      </View>
    </View>
  );
}

type TileProps<K extends string> = { item: StatusTabItem<K>; variant: Variant; style: ViewStyle; selected: boolean; onPress: () => void };

function StatusTile<K extends string>({ item, variant, style, selected, onPress }: TileProps<K>) {
  const { colors } = useTheme();
  const tone = palette[item.tone];
  const fill = colors[tone.fill];
  const on = textOn(fill);
  const progress = useSharedValue(selected ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(selected ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [selected, progress]);

  const scale = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.04 * pressed.get() }] }));
  const filled = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const resting = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  const press = (to: number) => pressed.set(withTiming(to, { duration: to ? 90 : 160 }));
  const cover = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 16 } as const;

  return (
    <Animated.View className="min-w-0" style={[style, scale]}>
      <Pressable
        testID={item.testID}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={item.count === undefined ? item.label : `${item.label}, ${item.count}`}
        onPress={onPress}
        onPressIn={() => press(1)}
        onPressOut={() => press(0)}
        className="flex-1 rounded-[16px]"
        style={{ backgroundColor: colors[tone.tint] }}
      >
        <Animated.View pointerEvents="none" style={[cover, { backgroundColor: fill, boxShadow: `0px 8px 16px ${withAlpha(fill, 0.32)}` }, filled]} />
        <Animated.View pointerEvents="none" style={[cover, { overflow: 'hidden' }, resting]}>
          <TileFace
            item={item}
            variant={variant}
            disc={colors.elevated}
            glyph={colors[tone.glyph]}
            count={item.count === 0 ? withAlpha(colors[tone.deep], 0.42) : colors[tone.deep]}
            label={colors['ink-2']}
          />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[cover, { overflow: 'hidden' }, filled]}>
          <TileFace item={item} variant={variant} disc={withAlpha(on, 0.2)} glyph={on} count={on} label={withAlpha(on, 0.9)} check={on} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

type FaceProps<K extends string> = { item: StatusTabItem<K>; variant: Variant; disc: string; glyph: string; count: string; label: string; check?: string };

/**
 * `hero`: disc and mark on top, a big count over the label at the bottom, the glyph large and faint
 * in the corner. `wide`: disc, label and count in one row. `cell`: disc and count on top, label and mark under.
 */
function TileFace<K extends string>({ item, variant, disc, glyph, count, label, check }: FaceProps<K>) {
  const hero = variant === 'hero';
  const wide = variant === 'wide';
  const discSize = hero ? 36 : wide ? 32 : 26;

  const discView = (
    <View className="items-center justify-center rounded-full" style={{ width: discSize, height: discSize, backgroundColor: disc }}>
      <Icon icon={item.icon} size={Math.round(discSize * 0.46)} rawColor={glyph} weight="bold" />
    </View>
  );
  const countView =
    item.count === undefined ? (
      check ? (
        <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: withAlpha(check, 0.24) }} />
      ) : (
        <Skeleton width={22} height={22} radius={6} />
      )
    ) : (
      <Text
        weight="bold"
        numeric
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={1.15}
        style={{ fontSize: hero ? 40 : wide ? 26 : 22, lineHeight: hero ? 44 : wide ? 30 : 26, letterSpacing: hero ? -1.4 : -0.6, color: count }}
      >
        {item.count > 999 ? '999+' : String(item.count)}
      </Text>
    );
  const labelView = (
    <Text
      weight={hero ? 'bold' : 'semibold'}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      maxFontSizeMultiplier={1.15}
      className="flex-shrink"
      style={{ fontSize: hero ? 14.5 : 12.5, lineHeight: hero ? 19 : 16, color: label }}
    >
      {item.label}
    </Text>
  );
  // A check on the selected tile, an arrow (as on the home to-do tiles) on the others, so they read as tappable.
  const markView = check ? (
    <View className="h-[18px] w-[18px] items-center justify-center rounded-full" style={{ backgroundColor: withAlpha(check, 0.22) }}>
      <Icon icon={CheckIcon} size={11} rawColor={check} weight="bold" />
    </View>
  ) : (
    <View className="h-[18px] w-[18px] items-center justify-center">
      <Icon icon={ArrowUpRightIcon} size={14} rawColor={glyph} weight="bold" />
    </View>
  );

  if (hero) {
    return (
      <View className="flex-1 justify-between p-3">
        <View pointerEvents="none" style={{ position: 'absolute', right: -16, bottom: -18, opacity: 0.12 }}>
          <Icon icon={item.icon} size={96} rawColor={glyph} />
        </View>
        <View className="flex-row items-start justify-between">
          {discView}
          {markView}
        </View>
        <View>
          {countView}
          {labelView}
        </View>
      </View>
    );
  }
  if (wide) {
    return (
      <View className="flex-1 flex-row items-center gap-2.5 px-3">
        {discView}
        <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
          {labelView}
          {markView}
        </View>
        {countView}
      </View>
    );
  }
  return (
    <View className="flex-1 justify-between px-2.5 pb-2 pt-2.5">
      <View className="flex-row items-center justify-between gap-1">
        {discView}
        {countView}
      </View>
      <View className="flex-row items-center justify-between gap-1">
        {labelView}
        {markView}
      </View>
    </View>
  );
}
