import type { ColorToken } from '@/core/theme/palette';
import { useTheme } from '@/core/theme/ThemeProvider';

import type { AppIcon, IconWeight } from './icons';

export type IconProps = {
  icon: AppIcon;
  size?: number;
  color?: ColorToken;
  /** Raw color, wins over `color`. Use only for colors outside the palette (e.g. white on primary). */
  rawColor?: string;
  /**
   * `regular` for inline glyphs, `bold` for tiny marks (checks, ✕ on chips) that must stay legible,
   * `fill` for the selected state (active tab), `duotone` for module and empty-state illustrations.
   */
  weight?: IconWeight;
  /** Mirror for RTL-sensitive arrows. */
  mirrored?: boolean;
};

/** Phosphor icon in palette colors. Pick icons from `./icons`, never from the package root. */
export function Icon({ icon: PhosphorComponent, size = 20, color = 'ink', rawColor, weight = 'regular', mirrored }: IconProps) {
  const { colors } = useTheme();
  return <PhosphorComponent size={size} color={rawColor ?? colors[color]} weight={weight} mirrored={mirrored} duotoneOpacity={0.22} />;
}
