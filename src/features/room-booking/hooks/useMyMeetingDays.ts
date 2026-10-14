import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { addDays, atMinutes, toDateKey, type DateKey } from '@/core/time/vn';

import { bookingsApi } from '../api/booking.api';
import { BookingStatus } from '../types';
import { bookingFrom } from '../utils/booking';

/** Days (from `startKey`, `days` long) on which I have a waiting or approved meeting: day-strip dots. */
export function useMyMeetingDays(startKey: DateKey, days = 7) {
  const connected = useSessionStore((s) => s.connected.room);
  const window = { fromDate: atMinutes(startKey, 0).toISOString(), toDate: atMinutes(addDays(startKey, days), 0).toISOString() };
  const query = useQuery({
    queryKey: qk.bookings.mine({ ...window, scope: 'day-strip' }),
    queryFn: () => bookingsApi.mine({ pageNumber: 1, pageSize: 100, ...window }),
    enabled: connected,
    staleTime: 60_000,
    select: (page) =>
      new Set(
        page.items
          .filter((b) => b.status === BookingStatus.Waiting || b.status === BookingStatus.Approved)
          .map((b) => toDateKey(bookingFrom(b) ?? new Date(0))),
      ),
  });
  return query.data;
}
