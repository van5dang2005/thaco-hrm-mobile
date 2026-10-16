import { diffDays, todayKey, type DateKey } from '@/core/time/vn';

/** Up to this many days left the deadline reads "Còn N ngày"; further out it shows the date. */
export const COUNTDOWN_DAYS = 7;

/** Within this many days an open task is "Đến hạn". */
export const DUE_SOON_DAYS = 3;

export type Deadline =
  /** More than `COUNTDOWN_DAYS` away: show the date. */
  | { state: 'date'; han: DateKey }
  | { state: 'left'; days: number }
  | { state: 'today' }
  | { state: 'overdue'; days: number };

/** Where `han` stands relative to `today`; null without a deadline. */
export function deadlineOf(han: DateKey | undefined, today: DateKey = todayKey()): Deadline | null {
  if (!han) return null;
  const days = diffDays(today, han);
  if (days < 0) return { state: 'overdue', days: -days };
  if (days === 0) return { state: 'today' };
  if (days <= COUNTDOWN_DAYS) return { state: 'left', days };
  return { state: 'date', han };
}

export function isOverdue(han: DateKey | undefined, today: DateKey = todayKey()) {
  return !!han && diffDays(today, han) < 0;
}
