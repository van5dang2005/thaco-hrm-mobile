/**
 * Parcel lifecycle, as run by ParcelExpiryJob from `createdAt` (appsettings: DueWarningDays=6,
 * ExpiryDays=7, MaxReminderDays=3): Due on day 6, Overdue on day 7, auto-cancelled around day 10.
 */
import { addDays, atMinutes, diffDays, parseServerDate, todayKey, toDateKey, type DateKey } from '@/core/time/vn';

import { ParcelStatus, type ParcelDto } from './types';

export const DUE_DAY = 6;
export const OVERDUE_DAY = 7;
export const CANCEL_DAY = 10;

export const MAX_PARCEL_FILES = 5;
export const MAX_PARCEL_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_BULK_CODES = 100;

type WithDates = Pick<ParcelDto, 'createdAt' | 'receivedAt'>;

/** The job counts from createdAt; the "my parcels" lookup omits it, so fall back to receivedAt. */
export function lifecycleStart(p: WithDates): Date | null {
  return parseServerDate(p.createdAt) ?? parseServerDate(p.receivedAt);
}

export type Deadline = {
  startKey: DateKey;
  /** "Hạn nhận": the day the parcel turns overdue. */
  dueKey: DateKey;
  cancelKey: DateKey;
  /** Calendar days until dueKey (negative when overdue). */
  daysLeft: number;
  /** 0…1 position on the 10-day lifecycle (detail header). */
  progress: number;
  /** 0…1 position on the way to the due day, full once overdue (list cards). */
  dueProgress: number;
};

export function parcelDeadline(p: WithDates, now = new Date()): Deadline | null {
  const start = lifecycleStart(p);
  if (!start) return null;
  const startKey = toDateKey(start);
  const dueKey = addDays(startKey, OVERDUE_DAY);
  const elapsed = (now.getTime() - start.getTime()) / (24 * 3600 * 1000);
  return {
    startKey,
    dueKey,
    cancelKey: addDays(startKey, CANCEL_DAY),
    daysLeft: diffDays(todayKey(now), dueKey),
    progress: Math.min(1, Math.max(0.02, elapsed / CANCEL_DAY)),
    dueProgress: Math.min(1, Math.max(0.02, elapsed / OVERDUE_DAY)),
  };
}

export const isOpenParcel = (status: ParcelStatus) =>
  status === ParcelStatus.Waiting || status === ParcelStatus.Due || status === ParcelStatus.Overdue;

/** Statuses of the "Chờ nhận / Quá hạn / Đã nhận / Đã hủy" tabs (6d). */
export const parcelTabs = {
  pending: [ParcelStatus.Waiting, ParcelStatus.Due],
  overdue: [ParcelStatus.Overdue],
  handed: [ParcelStatus.HandedOver],
  cancelled: [ParcelStatus.Cancelled],
} as const;

export type ParcelTab = keyof typeof parcelTabs;

/** Title line of a parcel card: company when known, else the sender's name. */
export const senderTitle = (p: Pick<ParcelDto, 'senderCompanyName' | 'senderFullName'>) => p.senderCompanyName || p.senderFullName;

/** "Lễ tân" date filter: the server compares `createdAt` with `fromDate`, so send the start of a VN day. */
export type ReceptionRange = 'all' | 'today' | 'week' | 'month';

export function rangeFromDate(range: ReceptionRange, now = new Date()): string | undefined {
  const days = { all: null, today: 0, week: 6, month: 29 }[range];
  if (days === null) return undefined;
  return atMinutes(addDays(todayKey(now), -days), 0).toISOString();
}

/** Tracking numbers are stored as `{sequence}_{code}`; only the code part is editable. */
export function splitTracking(trackingNumber: string): { sequence: string | null; code: string } {
  const index = trackingNumber.indexOf('_');
  if (index <= 0) return { sequence: null, code: trackingNumber };
  return { sequence: trackingNumber.slice(0, index), code: trackingNumber.slice(index + 1) };
}

/** Bulk entry: one code per line (commas and semicolons also split), blanks dropped. */
export function parseTrackingList(text: string) {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function duplicatesOf(codes: string[]) {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  codes.forEach((code) => {
    const key = code.toLowerCase();
    if (seen.has(key)) dupes.add(code);
    seen.add(key);
  });
  return [...dupes];
}
