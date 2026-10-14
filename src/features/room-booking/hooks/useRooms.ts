import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { roomsApi } from '../api/room.api';
import { useRoomConnected } from './useRoomConnected';

export function useRooms(areaId?: string, departmentId?: string) {
  const enabled = useRoomConnected() && !!areaId;
  return useQuery({
    queryKey: qk.rooms.list(areaId, departmentId),
    queryFn: () => roomsApi.rooms(areaId, departmentId),
    enabled,
    staleTime: 5 * 60 * 1000,
    select: (rooms) => [...rooms].filter((r) => r.isActive !== false).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || (a.name ?? '').localeCompare(b.name ?? '')),
  });
}
