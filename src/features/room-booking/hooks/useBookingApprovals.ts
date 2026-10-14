import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';
import { approvalsApi } from '@/features/approval/api/approval.api';

import { useRoomConnected } from './useRoomConnected';

export function useBookingApprovals(id?: string) {
  const enabled = useRoomConnected() && !!id;
  return useQuery({ queryKey: qk.bookings.approvals(id ?? ''), queryFn: () => approvalsApi.forBooking(id!), enabled });
}
