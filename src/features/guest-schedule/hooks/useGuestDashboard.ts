import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { guestApi } from '../api/guest.api';

/** Counters and today's visits of the "Quản lý lịch khách" dashboard. */
export function useGuestDashboard() {
  return useQuery({ queryKey: qk.guests.dashboard, queryFn: guestApi.dashboard });
}
