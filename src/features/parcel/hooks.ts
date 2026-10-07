import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';

import { delegationsApi, parcelsApi } from './api';

/** GET /api/parcels/my/stats — feeds the 3 counters (3i) and the home tile badge. */
export function useMyParcelStats() {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({ queryKey: qk.parcels.myStats, queryFn: parcelsApi.myStats, enabled: connected });
}

export function useParcel(id?: string) {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({ queryKey: qk.parcels.detail(id ?? ''), queryFn: () => parcelsApi.detail(id!), enabled: connected && !!id });
}

/**
 * Every delegation related to me (as authorizer or delegate). The list is small per person, so
 * one large page is read and split client-side into "Tôi ủy quyền" / "Được ủy quyền".
 */
export function useMyDelegations() {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({
    queryKey: qk.delegations.list({ all: true }),
    queryFn: () => delegationsApi.list({ pageNumber: 1, pageSize: 200 }),
    enabled: connected,
    select: (page) => page.items,
  });
}

/** Parcels I can still create a per-parcel delegation for (`my?addDelegation=true`). */
export function useDelegatableParcels(enabled = true) {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({
    queryKey: qk.parcels.my({ addDelegation: true }),
    queryFn: () => parcelsApi.my({ pageNumber: 1, pageSize: 100, addDelegation: true }),
    enabled: connected && enabled,
    select: (page) => page.items,
  });
}

/** Units the reception may work on (`GET /api/departments/accessible`), for the unit filter. */
export function useAccessibleDepartments(enabled = true) {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({
    queryKey: qk.parcels.departments,
    queryFn: parcelsApi.accessibleDepartments,
    enabled: connected && enabled,
    staleTime: 10 * 60 * 1000,
  });
}

/** Counters of the reception list (`GET /api/parcels/stats`), same filters minus status / search. */
export function useReceptionStats(params: { departmentId?: string; fromDate?: string }, enabled = true) {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({ queryKey: qk.parcels.receptionStats(params), queryFn: () => parcelsApi.stats(params), enabled: connected && enabled });
}
