import type { ColorToken } from '@/core/theme/palette';
import { useTheme } from '@/core/theme/ThemeProvider';

import type { AppIcon, IconWeight } from './icons';

const strokeFor: Record<IconWeight, number> = { light: 1.5, regular: 1.8, bold: 2.2, fill: 2.2 };

export type IconProps = {
  icon: AppIcon;
  size?: number;
  color?: ColorToken;
  /** Raw color, wins over `color`. Use only for colors outside the palette (e.g. white on primary). */
  rawColor?: string;
  /** Stroke width preset (design: 1.8–2); `bold` for tiny marks (checks, ✕ on chips) that must stay legible. */
  weight?: IconWeight;
  /** Explicit stroke width, wins over `weight`. */
  strokeWidth?: number;
  /** Mirror for RTL-sensitive arrows. */
  mirrored?: boolean;
};

/** Lucide icon in palette colors. Pick icons from `./icons`, never from the package root. */
export function Icon({ icon: LucideComponent, size = 20, color = 'ink', rawColor, weight = 'regular', strokeWidth, mirrored }: IconProps) {
  const { colors } = useTheme();
  return (
    <LucideComponent
      size={size}
      color={rawColor ?? colors[color]}
      strokeWidth={strokeWidth ?? strokeFor[weight]}
      style={mirrored ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
