import { useQuery } from '@tanstack/react-query';

import { isApiError } from '@/core/api/ApiError';
import { useRoomMe } from '@/core/session/useMe';

import { roomsApi } from '../api/room.api';
import type { RoomDto } from '../types';
import { crossLevelStatus, type CrossLevelContext } from '../utils/booking';
import { useAreas } from './useAreas';
import { useRoomConnected } from './useRoomConnected';

/** Department list for exact cross-level checks; optional (falls back to a partial check). */
function useDepartmentTree() {
  const enabled = useRoomConnected();
  return useQuery({
    queryKey: ['rooms', 'department-tree'],
    queryFn: roomsApi.departments,
    enabled,
    staleTime: 60 * 60 * 1000,
    retry: (count, error) => !(isApiError(error) && error.status === 403) && count < 1,
    select: (page) => new Map(page.items.map((d) => [d.id.toLowerCase(), d.parentId ? d.parentId.toLowerCase() : null])),
  });
}

export function useCrossLevel() {
  const me = useRoomMe();
  const areas = useAreas();
  const tree = useDepartmentTree();
  const ctx: CrossLevelContext = {
    userDepartments: me.data?.departments ?? [],
    areas: areas.data ?? [],
    parentMap: tree.data && tree.data.size > 0 ? tree.data : undefined,
  };
  return (room: RoomDto) => crossLevelStatus(room, ctx);
}
