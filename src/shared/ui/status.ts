/**
 * One color language for every status enum (CLAUDE.md §5, PROMPT_UNIFIED StatusBadge table).
 * Enums arrive as numbers on the wire; the numbering differs per enum, so each gets its own map.
 */
import { parseServerDate } from '@/core/time/vn';

export type BadgeKind = 'wait' | 'warn' | 'danger' | 'ok' | 'off' | 'live';

/** ParcelStatus: 1 Waiting, 2 Due, 3 Overdue, 4 Cancelled, 5 HandedOver. */
const parcelKinds: Record<number, BadgeKind> = { 1: 'wait', 2: 'warn', 3: 'danger', 4: 'off', 5: 'ok' };

/** DelegationStatus: 1 Expired, 2 DueSoon, 3 Active, 4 Rejected, 5 Waiting (note the reversed numbering). */
const delegationKinds: Record<number, BadgeKind> = { 1: 'off', 2: 'warn', 3: 'ok', 4: 'danger', 5: 'wait' };

/** BookingStatus: 1 Waiting, 2 Approved, 3 Rejected, 4 Finished, 5 Canceled. */
const bookingKinds: Record<number, BadgeKind> = { 1: 'wait', 2: 'ok', 3: 'danger', 4: 'off', 5: 'off' };

export const parcelBadgeKind = (status?: number | null): BadgeKind => parcelKinds[status ?? 0] ?? 'off';
export const delegationBadgeKind = (status?: number | null): BadgeKind => delegationKinds[status ?? 0] ?? 'off';
export const bookingBadgeKind = (status?: number | null): BadgeKind => bookingKinds[status ?? 0] ?? 'off';

const BOOKING_APPROVED = 2;

type Timed = { status?: number | null; from?: string | null; to?: string | null };

/** "Đang diễn ra": approved, and now is inside from–to. Approved bookings never change status by themselves. */
export function isBookingLive(b: Timed, now = new Date()): boolean {
  if (b.status !== BOOKING_APPROVED) return false;
  const from = parseServerDate(b.from);
  const to = parseServerDate(b.to);
  return !!from && !!to && now >= from && now < to;
}

/** Badge kind of a booking including the derived live state. */
export function bookingDisplayKind(b: Timed, now = new Date()): BadgeKind {
  return isBookingLive(b, now) ? 'live' : bookingBadgeKind(b.status);
}
