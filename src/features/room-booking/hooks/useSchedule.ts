import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { bookingsApi, type ScheduleQuery } from '../api/booking.api';
import { useRoomConnected } from './useRoomConnected';

/** `options.staleTime: 0` asks the server again every time this window is shown (e.g. the selected day changes). */
export function useSchedule(query: ScheduleQuery, enabled = true, options?: { staleTime?: number }) {
  const connected = useRoomConnected();
  return useQuery({ queryKey: qk.bookings.schedule(query), queryFn: () => bookingsApi.schedule(query), enabled: connected && enabled && !!query.areaId, ...options });
}
