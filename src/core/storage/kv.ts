import { createMMKV } from 'react-native-mmkv';

/** Small settings and per-device preferences. Never put secrets here (use SecureStore). */
export const kv = createMMKV({ id: 'thaco-hrm.settings' });

/** Persisted TanStack Query cache. Cleared on sign-out. */
export const queryCacheStore = createMMKV({ id: 'thaco-hrm.query-cache' });

export const kvKeys = {
  language: 'settings.language',
  colorScheme: 'settings.colorScheme',
  /** Profile → "Thông báo": pop a toast for live notifications (the bell badge updates either way). */
  notificationPopups: 'settings.notificationPopups',
  lastDomain: 'auth.lastDomain',
  lastUsername: 'auth.lastUsername',
  /** "Ghi nhớ đăng nhập": prefill the login form with `rememberedUsername`. */
  rememberLogin: 'auth.rememberLogin',
  rememberedUsername: 'auth.rememberedUsername',
  biometricEnabled: 'auth.biometricEnabled',
  lastAreaId: 'rooms.lastAreaId',
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
