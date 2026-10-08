import { isApiError, type ServiceId } from '@/core/api/ApiError';
import { parcelApi, roomApi } from '@/core/api/clients';
import { setUnauthorizedHandler } from '@/core/api/http';
import type { AuthResponse, LoginRequest } from '@/core/api/types';
import { clearQueryCache } from '@/core/query/queryClient';
import { kv, kvKeys } from '@/core/storage/kv';

import { useSessionStore } from './sessionStore';
import { tokenStore } from './tokenStore';

export type SignInResult = {
  /** Services that rejected or could not be reached; the app runs with the others. */
  failed: { service: ServiceId; error: unknown }[];
};

const loginTo = (client: typeof parcelApi, request: LoginRequest) =>
  client.post<AuthResponse>('/api/auth/login', request, { auth: false });

function pickError(errors: unknown[]) {
  // A credential error from either service explains the failure better than a network error.
  return errors.find((error) => isApiError(error) && (error.status === 401 || error.status === 400)) ?? errors[0];
}

/** Logs in to BOTH back-ends with the same domain credentials and keeps two token sets. */
export async function signIn(request: LoginRequest): Promise<SignInResult> {
  const [parcel, room] = await Promise.allSettled([loginTo(parcelApi, request), loginTo(roomApi, request)]);
  const outcomes = { parcel, room } as const;

  const failed: SignInResult['failed'] = [];
  const connected: Record<ServiceId, boolean> = { parcel: false, room: false };
  const roles: Partial<Record<ServiceId, string[]>> = {};

  for (const service of ['parcel', 'room'] as const) {
    const outcome = outcomes[service];
    if (outcome.status === 'fulfilled' && outcome.value?.token) {
      await tokenStore.set(service, { token: outcome.value.token, refreshToken: outcome.value.refreshToken });
      connected[service] = true;
      roles[service] = outcome.value.roles ?? [];
    } else {
      await tokenStore.set(service, null);
      failed.push({ service, error: outcome.status === 'rejected' ? outcome.reason : new Error('EMPTY_TOKEN') });
    }
  }

  if (!connected.parcel && !connected.room) throw pickError(failed.map((f) => f.error));

  kv.set(kvKeys.lastUsername, request.username);
  kv.set(kvKeys.lastDomain, request.domain);
  // A different person may be signing in on a shared device; never show their cached data.
  clearQueryCache();
  useSessionStore.getState().markSignedIn({ username: request.username, connected, roles });
  return { failed };
}

/**
 * Checks domain credentials without touching the session (Profile → turn on Face ID): either
 * back-end accepting them is enough. Throws the more telling error when both refuse.
 */
export async function verifyCredentials(request: LoginRequest): Promise<void> {
  const results = await Promise.allSettled([loginTo(parcelApi, request), loginTo(roomApi, request)]);
  if (results.some((r) => r.status === 'fulfilled' && !!r.value?.token)) return;
  throw pickError(results.map((r) => (r.status === 'rejected' ? r.reason : new Error('EMPTY_TOKEN'))));
}

let signingOut = false;

export async function signOut() {
  if (signingOut) return;
  signingOut = true;
  try {
    await tokenStore.clear();
    clearQueryCache();
    useSessionStore.getState().markSignedOut();
  } finally {
    signingOut = false;
  }
}

/** Restores the two token sets on cold start. Tokens are validated lazily by the first API call. */
export async function restoreSession() {
  const tokens = await tokenStore.restore();
  const connected = { parcel: !!tokens.parcel, room: !!tokens.room };
  if (connected.parcel || connected.room) {
    useSessionStore.getState().markSignedIn({ username: kv.getString(kvKeys.lastUsername) ?? null, connected });
  } else {
    useSessionStore.getState().markSignedOut();
  }
}

let expiredListener: (() => void) | null = null;

/** UI hook-in point for "session expired" feedback (toast). */
export function onSessionExpired(listener: () => void) {
  expiredListener = listener;
}

setUnauthorizedHandler(() => {
  if (useSessionStore.getState().status !== 'signedIn') return;
  expiredListener?.();
  void signOut();
});
