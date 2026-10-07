import { vars } from 'nativewind';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';

import { kv, kvKeys } from '@/core/storage/kv';

import { cssVarsFor, palettes, type ColorScheme, type Palette } from './palette';

export type SchemePreference = 'system' | ColorScheme;

type ThemeContextValue = {
  scheme: ColorScheme;
  colors: Palette;
  preference: SchemePreference;
  setPreference: (preference: SchemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const schemeVars = {
  light: vars(cssVarsFor(palettes.light)),
  dark: vars(cssVarsFor(palettes.dark)),
};

function readPreference(): SchemePreference {
  const stored = kv.getString(kvKeys.colorScheme);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<SchemePreference>(readPreference);

  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const setPreference = useCallback((next: SchemePreference) => {
    if (next === 'system') kv.remove(kvKeys.colorScheme);
    else kv.set(kvKeys.colorScheme, next);
    setPreferenceState(next);
  }, []);

  const value = useMemo(
    () => ({ scheme, colors: palettes[scheme], preference, setPreference }),
    [scheme, preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, schemeVars[scheme]]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
