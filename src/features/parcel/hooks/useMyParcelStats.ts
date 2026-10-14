import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';

import { parcelsApi } from '../api/parcel.api';

/** GET /api/parcels/my/stats — feeds the 3 counters (3i) and the home tile badge. */
export function useMyParcelStats() {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({ queryKey: qk.parcels.myStats, queryFn: parcelsApi.myStats, enabled: connected });
}
