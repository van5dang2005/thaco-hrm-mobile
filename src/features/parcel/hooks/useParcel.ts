import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';

import { parcelsApi } from '../api/parcel.api';

export function useParcel(id?: string) {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({ queryKey: qk.parcels.detail(id ?? ''), queryFn: () => parcelsApi.detail(id!), enabled: connected && !!id });
}
