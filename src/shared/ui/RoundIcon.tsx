import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { ColorToken } from '@/core/theme/palette';
import { useTheme } from '@/core/theme/ThemeProvider';

import { Icon } from './Icon';
import type { AppIcon } from './icons';

/**
 * `brand` (default) = #EEF3F9 ring, the home grid style; status tones follow the badge kinds;
 * `solid` = primary fill (selected service); `onBlue` = white disc on the blue header.
 */
export type RoundIconTone = 'brand' | 'wait' | 'warn' | 'danger' | 'ok' | 'off' | 'solid' | 'onBlue';

const tones: Record<RoundIconTone, { box: ColorToken; icon: ColorToken }> = {
  brand: { box: 'icon-ring', icon: 'primary-tint-text' },
  wait: { box: 'primary-tint', icon: 'primary-tint-text' },
  warn: { box: 'warning-tint', icon: 'warning' },
  danger: { box: 'danger-tint', icon: 'danger' },
  ok: { box: 'success-tint', icon: 'success' },
  off: { box: 'off-tint', icon: 'subtle' },
  solid: { box: 'primary', icon: 'on-primary' },
  onBlue: { box: 'header-name', icon: 'header' },
};

/** Round (or rounded-square) tinted icon; the glyph is 45% of the size. Children overlay it (check marks, badges). */
export function RoundIcon({ icon, size = 40, tone = 'brand', square, children }: { icon: AppIcon; size?: number; tone?: RoundIconTone; /** Rounded square (radius ≈ 30%) instead of a circle: sheet headers. */ square?: boolean; children?: ReactNode }) {
  const { colors } = useTheme();
  const t = tones[tone];
  return (
    <View className="flex-shrink-0 items-center justify-center" style={{ width: size, height: size, borderRadius: square ? Math.round(size * 0.3) : size / 2, backgroundColor: colors[t.box] }}>
      <Icon icon={icon} size={Math.round(size * 0.45)} rawColor={colors[t.icon]} />
      {children}
    </View>
  );
}
