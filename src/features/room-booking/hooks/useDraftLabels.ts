import { useTranslation } from 'react-i18next';

import { formatKey, formatMinutes, weekdayOf } from '@/core/time/vn';

import { draftSessions, type BookingDraft } from '../store/draftStore';

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
