import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';

import { parcelsApi } from '../api/parcel.api';

/** Counters of the reception list (`GET /api/parcels/stats`), same filters minus status / search. */
export function useReceptionStats(params: { departmentId?: string; fromDate?: string }, enabled = true) {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({ queryKey: qk.parcels.receptionStats(params), queryFn: () => parcelsApi.stats(params), enabled: connected && enabled });
}
