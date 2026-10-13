import { create } from 'zustand';

import type { ServiceId } from '@/core/api/ApiError';

import { grantedServices, type MyApp } from './myApps';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

/** Why there is no session: the login screen offers biometric sign-in on its own unless the user signed out by hand. */
export type SignOutReason = 'launch' | 'user' | 'expired';

type SessionState = {
  status: SessionStatus;
  username: string | null;
  /** Apps the THACO apps portal grants; `null` while unknown (portal unreachable at sign-in). */
  apps: MyApp[] | null;
  /** Back-ends this user may call, derived from `apps` (`grantedServices`). The SSO token itself serves all of them. */
  connected: Record<ServiceId, boolean>;
  signOutReason: SignOutReason | null;
  markSignedIn: (payload: { username: string | null; apps: MyApp[] | null }) => void;
  markSignedOut: (reason: SignOutReason) => void;
  setApps: (apps: MyApp[]) => void;
};

/** `connected` for `apps`; keeps `current` while no flag changes, so effects on it (hubs) do not restart. */
function connectedFor(apps: MyApp[] | null, current: Record<ServiceId, boolean>) {
  const next = grantedServices(apps);
  return (Object.keys(next) as ServiceId[]).every((service) => next[service] === current[service]) ? current : next;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  username: null,
  apps: null,
  connected: grantedServices(null),
  signOutReason: null,
  markSignedIn: ({ username, apps }) => set((s) => ({ status: 'signedIn', username, apps, connected: connectedFor(apps, s.connected), signOutReason: null })),
  markSignedOut: (signOutReason) => set((s) => ({ status: 'signedOut', username: null, apps: null, connected: connectedFor(null, s.connected), signOutReason })),
  setApps: (apps) => set((s) => ({ apps, connected: connectedFor(apps, s.connected) })),
}));

export const isAdministrator = (roles: string[]) => roles.some((role) => role.toLowerCase() === 'administrator');
