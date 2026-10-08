import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import type { LoginRequest } from '@/core/api/types';
import { kv, kvKeys } from '@/core/storage/kv';

const CREDENTIALS_KEY = 'thaco.biometric.credentials';

export type BiometricKind = 'face' | 'fingerprint' | 'none';

export async function biometricKind(): Promise<BiometricKind> {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hasHardware || !enrolled) return 'none';
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    return 'none';
  } catch {
    return 'none';
  }
}

export function isBiometricEnabled() {
  return kv.getBoolean(kvKeys.biometricEnabled) === true;
}

/**
 * Stores the domain credentials in the keychain/keystore, readable only after a biometric check.
 * Opt-in: the user is asked after a successful password sign-in.
 */
export async function enableBiometric(credentials: LoginRequest, prompt: string) {
  await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials), {
    requireAuthentication: true,
    authenticationPrompt: prompt,
  });
  kv.set(kvKeys.biometricEnabled, true);
}

/** One Face ID / fingerprint check (turning biometric sign-in on from Profile). */
export async function confirmBiometric(prompt: string, cancelLabel: string) {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, cancelLabel, disableDeviceFallback: false });
  return result.success;
}

export async function readBiometricCredentials(prompt: string): Promise<LoginRequest | null> {
  const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY, { requireAuthentication: true, authenticationPrompt: prompt });
  return raw ? (JSON.parse(raw) as LoginRequest) : null;
}

export async function disableBiometric() {
  kv.remove(kvKeys.biometricEnabled);
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
}
