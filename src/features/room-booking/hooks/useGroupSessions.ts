import { sameId } from '@/core/session/userTypes';
import { parseServerDate } from '@/core/time/vn';

import type { BookingDto } from '../types';
import { useSchedule } from './useSchedule';

/**
 * Sessions of a booking's group. There is no group endpoint, so this reads the area schedule over a
 * wide window and filters by groupId. Only used for series (isSingleBooking = false).
 */
export function useGroupSessions(booking?: BookingDto | null) {
  const from = parseServerDate(booking?.from);
  const areaId = booking?.room?.areaId ?? booking?.room?.area?.id ?? undefined;
  const enabled = !!booking && booking.isSingleBooking === false && !!from;
  const query = useSchedule(
    {
      fromDate: new Date((from?.getTime() ?? 0) - 120 * 24 * 3600_000).toISOString(),
      toDate: new Date((from?.getTime() ?? 0) + 240 * 24 * 3600_000).toISOString(),
      areaId,
    },
    enabled,
  );
  const sessions = (query.data ?? [])
    .filter((b) => sameId(b.groupId, booking?.groupId))
    .sort((a, b) => (a.from ?? '').localeCompare(b.from ?? ''));
  return { ...query, sessions: enabled ? sessions : booking ? [booking] : [] };
}
