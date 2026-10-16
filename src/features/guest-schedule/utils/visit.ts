import { diffDays, parseServerDate, toDateKey, todayKey } from '@/core/time/vn';

import type { GuestScheduleDto, GuestVisit } from '../types';

/** The code in a scanned QR: the text itself, or the segment after `/qr/` when the QR holds the API link. */
export function qrCodeOf(text: string): string {
  const value = text.trim();
  return value.match(/\/qr\/([^/?#\s]+)/i)?.[1] ?? value;
}

/** The visit in a lookup response; null when it holds none. */
export function toVisit(dto: GuestScheduleDto | null | undefined, qrCode: string): GuestVisit | null {
  if (!dto?.guestScheduleId) return null;
  const units = (dto.workingUnits ?? []).map((unit) => unit.workingUnitName?.trim()).filter(Boolean);
  return {
    id: dto.guestScheduleId,
    qrCode,
    code: dto.guestCode?.trim() || undefined,
    groupName: dto.guestName?.trim() || dto.guestCode?.trim() || '',
    purpose: dto.purpose?.trim() || null,
    guestCount: Math.max(1, dto.guestCount ?? dto.members?.length ?? 1),
    fromDate: dto.startDate ?? '',
    toDate: dto.endDate ?? dto.startDate ?? '',
    location: units.length ? units.join(', ') : null,
  };
}

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
