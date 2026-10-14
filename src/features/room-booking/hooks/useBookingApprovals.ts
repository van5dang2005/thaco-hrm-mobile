import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { bookingsApi } from '../api/booking.api';
import { useRoomConnected } from './useRoomConnected';

export function useBookingApprovals(id?: string) {
  const enabled = useRoomConnected() && !!id;
  return useQuery({ queryKey: qk.bookings.approvals(id ?? ''), queryFn: () => bookingsApi.approvals(id!), enabled });
}
