import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';

import { parcelsApi } from './api';

/** GET /api/parcels/my/stats — feeds the 3 counters (3i) and the home tile badge. */
export function useMyParcelStats() {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({ queryKey: qk.parcels.myStats, queryFn: parcelsApi.myStats, enabled: connected });
}

export function useParcel(id?: string) {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({ queryKey: qk.parcels.detail(id ?? ''), queryFn: () => parcelsApi.detail(id!), enabled: connected && !!id });
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
