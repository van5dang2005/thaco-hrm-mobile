import { create } from 'zustand';

import type { ServiceId } from '@/core/api/ApiError';

import type { MyApp } from './myApps';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

/** Why there is no session: the login screen offers biometric sign-in on its own unless the user signed out by hand. */
export type SignOutReason = 'launch' | 'user' | 'expired';

type SessionState = {
  status: SessionStatus;
  username: string | null;
  /** Back-ends this user may call (granted on the apps portal). The SSO token itself serves all of them. */
  connected: Record<ServiceId, boolean>;
  /** Apps the THACO apps portal grants; `null` while unknown (portal unreachable at sign-in). */
  apps: MyApp[] | null;
  signOutReason: SignOutReason | null;
  markSignedIn: (payload: { username: string | null; connected: Record<ServiceId, boolean>; apps: MyApp[] | null }) => void;
  markSignedOut: (reason: SignOutReason) => void;
  setApps: (apps: MyApp[], connected: Record<ServiceId, boolean>) => void;
};

const noServices = { parcel: false, room: false };

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  username: null,
  connected: noServices,
  apps: null,
  signOutReason: null,
  markSignedIn: ({ username, connected, apps }) => set({ status: 'signedIn', username, connected, apps, signOutReason: null }),
  markSignedOut: (signOutReason) => set({ status: 'signedOut', username: null, connected: noServices, apps: null, signOutReason }),
  setApps: (apps, connected) => set({ apps, connected }),
}));

export const isAdministrator = (roles: string[]) => roles.some((role) => role.toLowerCase() === 'administrator');
