import type { ColorToken } from '@/core/theme/palette';
import { useTheme } from '@/core/theme/ThemeProvider';

/** The five semantic tones of the v3 design (CLAUDE.md §5): wait · warn · danger · ok · off. */
export type Tone = 'wait' | 'warn' | 'danger' | 'ok' | 'off';

/** Background tint / text / solid mark / border (selected tab, outlined buttons) per tone. */
const toneTokens: Record<Tone, { tint: ColorToken; text: ColorToken; solid: ColorToken; border: ColorToken }> = {
  wait: { tint: 'primary-tint', text: 'primary-tint-text', solid: 'primary', border: 'wait-border' },
  warn: { tint: 'warning-tint', text: 'warning-text', solid: 'warning', border: 'warning-tint' },
  danger: { tint: 'danger-tint', text: 'danger-text', solid: 'danger', border: 'danger-border' },
  ok: { tint: 'success-tint', text: 'success-text', solid: 'success', border: 'success-border' },
  off: { tint: 'off-tint', text: 'off-text', solid: 'subtle', border: 'input-border' },
};

export function useToneColors(tone: Tone) {
  const { colors } = useTheme();
  const t = toneTokens[tone];
  return { tint: colors[t.tint], text: colors[t.text], solid: colors[t.solid], border: colors[t.border] };
}
