import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { bookingsApi, type ScheduleQuery } from '../api/booking.api';
import { useRoomConnected } from './useRoomConnected';

export function useSchedule(query: ScheduleQuery, enabled = true) {
  const connected = useRoomConnected();
  return useQuery({ queryKey: qk.bookings.schedule(query), queryFn: () => bookingsApi.schedule(query), enabled: connected && enabled && !!query.areaId });
}
