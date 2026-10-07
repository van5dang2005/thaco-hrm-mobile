import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { addDays, atMinutes, formatKey, formatMinutes, toDateKey, weekdayOf, type DateKey } from '@/core/time/vn';

import { bookingsApi } from './api';
import { draftSessions, type BookingDraft } from './draftStore';
import { bookingFrom } from './logic';
import { BookingStatus } from './types';

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

/** Labels describing the draft's time and repetition, shared by the B3 summary and the B4 ticket. */
export function useDraftLabels(draft: BookingDraft) {
  const { t } = useTranslation();
  const sessions = draftSessions(draft);
  const recurring = draft.recurrence !== 'none';
  const recurrenceName = draft.recurrence === 'weekly' ? t('booking.recurrenceWeekly') : t('booking.recurrenceDaily');
  const weekdayShort = t(`time.weekdayShort.${String(weekdayOf(draft.dateKey)) as '0'}`);
  const weekday = t(`time.weekday.${String(weekdayOf(draft.dateKey)) as '0'}`);
  const last = sessions[sessions.length - 1];
  return {
    sessions,
    recurring,
    time: `${formatMinutes(draft.startMin)}–${formatMinutes(draft.endMin)}`,
    timeSpaced: `${formatMinutes(draft.startMin)} – ${formatMinutes(draft.endMin)}`,
    /** "T2 05/10" */
    dayShort: `${weekdayShort} ${formatKey(draft.dateKey, false)}`,
    /** "Hằng tuần × 5" or null. */
    repeat: recurring ? t('booking.repeatTimes', { recurrence: recurrenceName, count: sessions.length }) : null,
    /** "Hằng tuần · 5 buổi" / "Một buổi". */
    badge: recurring ? t('booking.repeatSummary', { recurrence: recurrenceName, count: sessions.length }) : t('booking.oneSession'),
    /** "Thứ Hai, 05/10 → 02/11/2026" / "Thứ Hai, 05/10/2026". */
    dates: recurring && last !== draft.dateKey ? `${weekday}, ${formatKey(draft.dateKey, false)} → ${formatKey(last)}` : `${weekday}, ${formatKey(draft.dateKey)}`,
  };
}
