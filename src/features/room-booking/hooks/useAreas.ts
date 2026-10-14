import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { roomsApi } from '../api/room.api';
import { useRoomConnected } from './useRoomConnected';

export function useAreas() {
  const enabled = useRoomConnected();
  return useQuery({ queryKey: qk.rooms.areas, queryFn: roomsApi.areas, enabled, staleTime: 10 * 60 * 1000, select: (page) => page.items.filter((a) => a.isActive !== false) });
}
