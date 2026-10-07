import { create } from 'zustand';

import type { ServiceId } from '@/core/api/ApiError';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

type SessionState = {
  status: SessionStatus;
  username: string | null;
  /** Which back-ends we hold a token for. A service can be down while the other works. */
  connected: Record<ServiceId, boolean>;
  roles: Record<ServiceId, string[]>;
  markSignedIn: (payload: { username: string | null; connected: Record<ServiceId, boolean>; roles?: Partial<Record<ServiceId, string[]>> }) => void;
  markSignedOut: () => void;
  setRoles: (service: ServiceId, roles: string[]) => void;
};

const noServices = { parcel: false, room: false };

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  username: null,
  connected: noServices,
  roles: { parcel: [], room: [] },
  markSignedIn: ({ username, connected, roles }) =>
    set((state) => ({
      status: 'signedIn',
      username,
      connected,
      roles: { parcel: roles?.parcel ?? state.roles.parcel, room: roles?.room ?? state.roles.room },
    })),
  markSignedOut: () => set({ status: 'signedOut', username: null, connected: noServices, roles: { parcel: [], room: [] } }),
  setRoles: (service, roles) => set((state) => ({ roles: { ...state.roles, [service]: roles } })),
}));

export const isAdministrator = (roles: string[]) => roles.some((role) => role.toLowerCase() === 'administrator');
