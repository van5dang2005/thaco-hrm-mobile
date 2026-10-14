import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { roomsApi } from '../api/room.api';
import { useRoomConnected } from './useRoomConnected';

/**
 * Approval workflows. The list can be permission-filtered; failures are tolerated and simply hide
 * "Duyệt N cấp" hints and future steps.
 */
export function useWorkflows() {
  const enabled = useRoomConnected();
  return useQuery({
    queryKey: qk.rooms.workflows,
    queryFn: roomsApi.workflows,
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
    select: (page) => page.items.filter((w) => w.isActive !== false),
  });
}
