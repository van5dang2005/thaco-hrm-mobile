// Deep imports: each package root re-exports all 18 weights/italics, which Metro would bundle.
import { BeVietnamPro_400Regular } from '@expo-google-fonts/be-vietnam-pro/400Regular';
import { BeVietnamPro_500Medium } from '@expo-google-fonts/be-vietnam-pro/500Medium';
import { BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro/600SemiBold';
import { BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { Platform, type TextStyle } from 'react-native';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

/** UI typefaces the user can pick in Profile → Settings. All cover Vietnamese diacritics. */
export type UiFont = 'jakarta' | 'beVietnam' | 'inter' | 'system';

export const DEFAULT_UI_FONT: UiFont = 'beVietnam';

export const uiFontOrder: UiFont[] = ['beVietnam', 'jakarta', 'inter', 'system'];

type FontSpec = {
  /** Display name, shown as-is in every language. */
  name: string;
  /** Font files to load, keyed by the family name used at render time. Empty for the system font. */
  assets: Record<string, number>;
  /** One family per weight: on Android, fontWeight alone does not switch faces of a custom font. */
  family: Record<FontWeight, string> | null;
};

export const uiFonts: Record<UiFont, FontSpec> = {
  jakarta: {
    name: 'Plus Jakarta Sans',
    assets: { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold },
    family: {
      regular: 'PlusJakartaSans_400Regular',
      medium: 'PlusJakartaSans_500Medium',
      semibold: 'PlusJakartaSans_600SemiBold',
      bold: 'PlusJakartaSans_700Bold',
    },
  },
  beVietnam: {
    name: 'Be Vietnam Pro',
    assets: { BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold },
    family: {
      regular: 'BeVietnamPro_400Regular',
      medium: 'BeVietnamPro_500Medium',
      semibold: 'BeVietnamPro_600SemiBold',
      bold: 'BeVietnamPro_700Bold',
    },
  },
  inter: {
    name: 'Inter',
    assets: { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold },
    family: {
      regular: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semibold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
    },
  },
  system: { name: 'System', assets: {}, family: null },
};

/** JetBrains Mono for MSNV, codes, times and counts. Fixed regardless of the UI font. */
export const monoAssets = { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_600SemiBold };

const monoFamily: Record<FontWeight, string> = {
  regular: 'JetBrainsMono_400Regular',
  medium: 'JetBrainsMono_500Medium',
  semibold: 'JetBrainsMono_600SemiBold',
  bold: 'JetBrainsMono_600SemiBold',
};

const SYSTEM_FAMILY = Platform.select({ ios: 'System', default: 'sans-serif' });

const systemWeight: Record<FontWeight, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export function fontStyle(font: UiFont, weight: FontWeight, mono = false): TextStyle {
  if (mono) return { fontFamily: monoFamily[weight] };
  const family = uiFonts[font].family;
  // The system font is named explicitly so it overrides a custom family when styles are merged.
  return family ? { fontFamily: family[weight] } : { fontFamily: SYSTEM_FAMILY, fontWeight: systemWeight[weight] };
}

/** Upper bound for Dynamic Type / font scale so dense layouts stay usable. */
export const MAX_FONT_SCALE = 1.35;
