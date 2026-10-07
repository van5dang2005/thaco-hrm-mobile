import { loadAsync } from 'expo-font';
import { create } from 'zustand';

import { kv, kvKeys } from '@/core/storage/kv';

import { DEFAULT_UI_FONT, fontStyle, uiFontOrder, uiFonts, type FontWeight, type UiFont } from './fonts';

function readStored(): UiFont {
  const stored = kv.getString(kvKeys.uiFont);
  return uiFontOrder.includes(stored as UiFont) ? (stored as UiFont) : DEFAULT_UI_FONT;
}

type FontState = {
  font: UiFont;
  setFont: (font: UiFont) => Promise<void>;
};

export const useFontStore = create<FontState>((set) => ({
  font: readStored(),
  setFont: async (font) => {
    // Load first so text never renders with a family that is not registered yet.
    await loadAsync(uiFonts[font].assets);
    kv.set(kvKeys.uiFont, font);
    set({ font });
  },
}));

/** Assets for the font chosen on a previous launch; loaded behind the splash screen. */
export function initialUiFontAssets() {
  return uiFonts[useFontStore.getState().font].assets;
}

/** Text style for the current UI font. Re-renders the caller when the user switches font. */
export function useFontStyle(weight: FontWeight = 'regular', mono = false) {
  const font = useFontStore((s) => s.font);
  return fontStyle(font, weight, mono);
}

/** Loads every selectable font, so the picker can preview each option in its own typeface. */
export function preloadAllUiFonts() {
  return loadAsync(Object.assign({}, ...uiFontOrder.map((f) => uiFonts[f].assets)));
}
