import { parseServerDate } from '@/core/time/vn';

import type { GuestScheduleItem } from '../types';

/** Where a visit is for the guard: still to come, inside the premises, or gone. */
export type VisitStage = 'upcoming' | 'inside' | 'left';

export function visitStage(visit: Pick<GuestScheduleItem, 'status'>): VisitStage {
  if (visit.status === 'checkedIn') return 'inside';
  return visit.status === 'checkedOut' ? 'left' : 'upcoming';
}

export const visitStart = (visit: Pick<GuestScheduleItem, 'from'>) => parseServerDate(visit.from) ?? new Date(0);
export const visitEnd = (visit: Pick<GuestScheduleItem, 'to'>) => parseServerDate(visit.to) ?? new Date(0);

/** Whole minutes from `a` to `b` (negative when `b` is earlier). */
export const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60_000);

/** "45" → { h: 0, m: 45 }; "80" → { h: 1, m: 20 }. */
export function splitMinutes(minutes: number) {
  const total = Math.abs(minutes);
  return { h: Math.floor(total / 60), m: total % 60 };
}
