import type { ReactNode } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import type { AppIcon, IconWeight } from './icons';

/**
 * Hand-drawn icons for glyphs Phosphor only has in a boxy style (calendar). 24px grid,
 * rounded joins and caps, same stroke widths as Phosphor at 24px, same props (`AppIcon`), so they
 * drop into `<Icon>`. Weights: thin / light / regular / bold change the stroke; `duotone` adds a
 * tinted fill; `fill` is drawn as duotone (a solid body would hide the inner strokes).
 */
const strokeFor: Record<IconWeight, number> = { thin: 1, light: 1.25, regular: 1.5, bold: 2, fill: 1.5, duotone: 1.5 };

function Glyph({ size, color, weight, duotoneOpacity, mirrored, body, details }: {
  size?: string | number;
  color?: string;
  weight?: IconWeight;
  duotoneOpacity?: number;
  mirrored?: boolean;
  /** Outline that gets the tinted fill in duotone. */
  body: (props: { fill: string; fillOpacity: number }) => ReactNode;
  details: ReactNode;
}) {
  const w = weight ?? 'regular';
  const c = color ?? '#000';
  const tinted = w === 'duotone' || w === 'fill';
  return (
    <Svg width={size ?? 24} height={size ?? 24} viewBox="0 0 24 24" style={mirrored ? { transform: [{ scaleX: -1 }] } : undefined}>
      <G stroke={c} strokeWidth={strokeFor[w]} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {body({ fill: tinted ? c : 'none', fillOpacity: tinted ? (w === 'fill' ? 0.35 : (duotoneOpacity ?? 0.2)) : 0 })}
        {details}
      </G>
    </Svg>
  );
}

/** Date grid under the calendar header: 3 + 2 dots, centred in the body. */
const dateDots = [
  [8, 13.6],
  [12, 13.6],
  [16, 13.6],
  [8, 17.1],
  [12, 17.1],
] as const;

/** Rounded calendar: two binder rings, a header rule and a dotted date grid. */
export const CalendarModernIcon: AppIcon = ({ size, color, weight, duotoneOpacity, mirrored }) => (
  <Glyph
    size={size}
    color={color}
    weight={weight}
    duotoneOpacity={duotoneOpacity}
    mirrored={mirrored}
    body={(fill) => <Rect {...fill} x={3.5} y={4.75} width={17} height={16} rx={3.75} />}
    details={
      <>
        <Path d="M8 3v3.5M16 3v3.5M3.5 9.75h17" />
        {dateDots.map(([cx, cy]) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1} fill={color ?? '#000'} stroke="none" />
        ))}
      </>
    }
  />
);
