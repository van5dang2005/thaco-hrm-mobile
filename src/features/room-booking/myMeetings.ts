import { addDays, toDateKey, weekdayOf, type DateKey } from '@/core/time/vn';

import { bookingFrom, bookingPhase, bookingTo } from './logic';
import { BookingStatus, type BookingDto } from './types';

export const MAX_DOTS = 3;

/** Monday of the week containing `key` (weeks run Monday–Sunday). */
export function weekStartOf(key: DateKey): DateKey {
  return addDays(key, -((weekdayOf(key) + 6) % 7));
}

export function weekKeys(start: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Bookings that still count as a meeting of mine (not rejected or cancelled). */
const counts = (b: BookingDto) => b.status === BookingStatus.Waiting || b.status === BookingStatus.Approved || b.status === BookingStatus.Finished;

/** Dots under a day cell: one per meeting that day, at most three. */
export function meetingDots(bookings: BookingDto[], key: DateKey): number {
  const n = bookings.filter((b) => counts(b) && toDateKey(bookingFrom(b) ?? new Date(0)) === key).length;
  return Math.min(MAX_DOTS, n);
}

/** "Đang diễn ra" is derived on the client: approved and now is inside from–to. */
export function isOngoing(b: BookingDto, now = new Date()): boolean {
  return b.status === BookingStatus.Approved && bookingPhase(b, now) === 'live';
}

export type MeetingTone = 'live' | 'waiting' | 'approved' | 'rejected' | 'off';

export function meetingTone(b: BookingDto, now = new Date()): MeetingTone {
  if (isOngoing(b, now)) return 'live';
  switch (b.status) {
    case BookingStatus.Waiting:
      return 'waiting';
    case BookingStatus.Approved:
      return 'approved';
    case BookingStatus.Rejected:
      return 'rejected';
    default:
      return 'off';
  }
}

/** Share of the meeting already elapsed (0–1) and whole minutes left. */
export function meetingProgress(b: BookingDto, now = new Date()) {
  const from = bookingFrom(b);
  const to = bookingTo(b);
  if (!from || !to || to <= from) return { ratio: 0, minutesLeft: 0 };
  const ratio = Math.min(1, Math.max(0, (now.getTime() - from.getTime()) / (to.getTime() - from.getTime())));
  return { ratio, minutesLeft: Math.max(0, Math.ceil((to.getTime() - now.getTime()) / 60_000)) };
}

/** Upcoming = not finished yet; past = ended, cancelled by status, or rejected before it started. */
export function isUpcoming(b: BookingDto, now = new Date()): boolean {
  const to = bookingTo(b);
  const open = b.status === BookingStatus.Waiting || b.status === BookingStatus.Approved;
  return open && !!to && to > now;
}
