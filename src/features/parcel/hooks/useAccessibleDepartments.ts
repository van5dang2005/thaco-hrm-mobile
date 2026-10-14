import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';

import { parcelsApi } from '../api/parcel.api';

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
