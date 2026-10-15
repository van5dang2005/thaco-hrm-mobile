import { diffDays, parseServerDate, toDateKey, todayKey } from '@/core/time/vn';

import type { GuestVisit } from '../types';

/** Where today falls in the visit's working period (Vietnam days). */
export type VisitPhase = { kind: 'upcoming' | 'ongoing' | 'ended'; /** 1-based day of the period. */ day: number; days: number };

export function visitPhase(visit: Pick<GuestVisit, 'fromDate' | 'toDate'>, now = new Date()): VisitPhase {
  const from = toDateKey(parseServerDate(visit.fromDate) ?? now);
  const to = toDateKey(parseServerDate(visit.toDate) ?? now);
  const today = todayKey(now);
  const days = Math.max(1, diffDays(from, to) + 1);
  const day = diffDays(from, today) + 1;
  return { kind: day < 1 ? 'upcoming' : day > days ? 'ended' : 'ongoing', day, days };
}
