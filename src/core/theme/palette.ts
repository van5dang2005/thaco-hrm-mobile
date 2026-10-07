import raw from './palette.json';

export type ColorToken = keyof typeof raw.light;
export type Palette = Record<ColorToken, string>;
export type ColorScheme = 'light' | 'dark';

export const palettes: Record<ColorScheme, Palette> = raw;

function hexToTriplet(hex: string) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** CSS variables consumed by the Tailwind colors declared in tailwind.config.js. */
export function cssVarsFor(palette: Palette): Record<`--c-${string}`, string> {
  const entries = Object.entries(palette).map(([key, hex]) => [`--c-${key}`, hexToTriplet(hex)]);
  return Object.fromEntries(entries);
}

export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = hexToTriplet(hex).split(' ');
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
