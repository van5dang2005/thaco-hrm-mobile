import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { roomsApi } from '../api/room.api';
import { useRoomConnected } from './useRoomConnected';

export function useDepartmentsWithRooms(areaId?: string) {
  const enabled = useRoomConnected() && !!areaId;
  return useQuery({ queryKey: qk.rooms.departments(areaId), queryFn: () => roomsApi.departmentsWithRooms(areaId), enabled, staleTime: 10 * 60 * 1000 });
}
