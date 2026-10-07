/**
 * Parcel lifecycle, as run by ParcelExpiryJob from `createdAt` (appsettings: DueWarningDays=6,
 * ExpiryDays=7, MaxReminderDays=3): Due on day 6, Overdue on day 7, auto-cancelled around day 10.
 */
import { sameId } from '@/core/session/userTypes';
import { addDays, atMinutes, diffDays, parseServerDate, todayKey, toDateKey, type DateKey } from '@/core/time/vn';

import { DelegationStatus, DelegationType, ParcelStatus, type DelegationDto, type ParcelDto, type ParcelLookupDto, type RelatedDelegation } from './types';

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
  /** 0…1 position on the 10-day lifecycle. */
  progress: number;
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
  };
}

export const isOpenParcel = (status: ParcelStatus) =>
  status === ParcelStatus.Waiting || status === ParcelStatus.Due || status === ParcelStatus.Overdue;

/** Statuses of the "Đang chờ / Quá hạn / Đã bàn giao / Đã hủy" chips (3i). */
export const parcelTabs = {
  pending: [ParcelStatus.Waiting, ParcelStatus.Due],
  overdue: [ParcelStatus.Overdue],
  handed: [ParcelStatus.HandedOver],
  cancelled: [ParcelStatus.Cancelled],
} as const;

export type ParcelTab = keyof typeof parcelTabs;

/** Title line of a parcel card: company when known, else the sender's name. */
export const senderTitle = (p: Pick<ParcelDto, 'senderCompanyName' | 'senderFullName'>) => p.senderCompanyName || p.senderFullName;

/** Delegations that count as "in force" for handover (ParcelHandoverValidator / repository). */
export function delegationAllowsHandover(d: RelatedDelegation, now = new Date()) {
  const waitingRenewal = d.status === DelegationStatus.Waiting && !!d.pendingEndDate;
  if (!d.parcelId) {
    const start = parseServerDate(d.startDate);
    const end = parseServerDate(d.endDate);
    const inWindow = !!start && !!end && start <= now && end >= now;
    return inWindow && (d.status === DelegationStatus.Active || d.status === DelegationStatus.DueSoon || waitingRenewal);
  }
  return d.status === DelegationStatus.Active || waitingRenewal;
}

export type Eligibility =
  | { kind: 'direct' }
  | { kind: 'detailed'; delegation: RelatedDelegation }
  | { kind: 'default'; delegation: RelatedDelegation }
  | { kind: 'none' };

/**
 * How a person may collect a parcel. `relatedDelegation` already follows the server precedence
 * (detailed for this parcel, else an in-window default), so it decides the delegation case.
 */
export function handoverEligibility(parcel: ParcelDto, userId: string, now = new Date()): Eligibility {
  if (sameId(parcel.receiverId, userId)) return { kind: 'direct' };
  const d = parcel.relatedDelegation;
  if (d && sameId(d.delegatorId, userId) && delegationAllowsHandover(d, now)) {
    return d.parcelId ? { kind: 'detailed', delegation: d } : { kind: 'default', delegation: d };
  }
  return { kind: 'none' };
}

/** Default delegation that blocks creating any other delegation (DELEGATION_DEFAULT_ACTIVE). */
export function activeDefaultOf(delegations: DelegationDto[], myId?: string) {
  return delegations.find(
    (d) =>
      d.appliedType === DelegationType.Default &&
      sameId(d.authorizerId, myId) &&
      (d.status === DelegationStatus.Active || d.status === DelegationStatus.DueSoon || d.status === DelegationStatus.Waiting),
  );
}

export type MyParcel = ParcelLookupDto;

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
