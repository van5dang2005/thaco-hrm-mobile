import { createMMKV } from 'react-native-mmkv';

/** Small settings and per-device preferences. Never put secrets here (use SecureStore). */
export const kv = createMMKV({ id: 'thaco-hrm.settings' });

/** Persisted TanStack Query cache. Cleared on sign-out. */
export const queryCacheStore = createMMKV({ id: 'thaco-hrm.query-cache' });

export const kvKeys = {
  language: 'settings.language',
  colorScheme: 'settings.colorScheme',
  uiFont: 'settings.uiFont',
  lastDomain: 'auth.lastDomain',
  lastUsername: 'auth.lastUsername',
  biometricEnabled: 'auth.biometricEnabled',
  lastAreaId: 'rooms.lastAreaId',
  drawerCollapsedGroups: 'home.drawerCollapsedGroups',
} as const;

export function readJSON<T>(key: string): T | undefined {
  const raw = kv.getString(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeJSON(key: string, value: unknown) {
  kv.set(key, JSON.stringify(value));
}
