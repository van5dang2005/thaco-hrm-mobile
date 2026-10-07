/**
 * Vietnam wall-clock helpers.
 *
 * The back-ends store and return UTC. The app always displays Asia/Ho_Chi_Minh (UTC+7, no DST)
 * regardless of the device timezone, so conversions use a fixed offset instead of Intl, which
 * keeps them deterministic on Hermes.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" in Vietnam time. */
export type DateKey = string;

export type VnParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Parses a server timestamp. Strings without a zone are treated as UTC (mirrors the web apps). */
export function parseServerDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
  const date = new Date(hasZone ? trimmed : `${trimmed}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function vnParts(date: Date): VnParts {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

/** Instant for a Vietnam wall-clock time. */
export function fromVn(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - VN_OFFSET_MS);
}

export function toDateKey(date: Date): DateKey {
  const p = vnParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function parseDateKey(key: DateKey) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

export function todayKey(now = new Date()): DateKey {
  return toDateKey(now);
}

export function addDays(key: DateKey, days: number): DateKey {
  const { year, month, day } = parseDateKey(key);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Whole calendar days from `a` to `b` (b - a). */
export function diffDays(a: DateKey, b: DateKey): number {
  const pa = parseDateKey(a);
  const pb = parseDateKey(b);
  return Math.round(
    (Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / DAY_MS,
  );
}

export function weekdayOf(key: DateKey): number {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Instant at `minutes` after Vietnam midnight of `key`. */
export function atMinutes(key: DateKey, minutes: number): Date {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day) - VN_OFFSET_MS + minutes * 60_000);
}

/** Minutes since Vietnam midnight. */
export function minutesOfDay(date: Date): number {
  const p = vnParts(date);
  return p.hour * 60 + p.minute;
}

/** "07:30:00" | "07:30" -> 450 */
export function parseTimeOfDay(value: string | null | undefined): number | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function formatMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, minutes));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function formatTime(date: Date | null | undefined): string {
  if (!date) return '';
  const p = vnParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatDayMonth(date: Date | null | undefined): string {
  if (!date) return '';
  const p = vnParts(date);
  return `${pad(p.day)}/${pad(p.month)}`;
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  const p = vnParts(date);
  return `${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

export function formatKey(key: DateKey, withYear = true): string {
  const { year, month, day } = parseDateKey(key);
  return withYear ? `${pad(day)}/${pad(month)}/${year}` : `${pad(day)}/${pad(month)}`;
}

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return '';
  return `${formatTime(date)} ${formatDayMonth(date)}`;
}

export function isSameVnDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b);
}

/** Rounds a minute value up to the next multiple of `step`. */
export function ceilToStep(minutes: number, step: number) {
  return Math.ceil(minutes / step) * step;
}

export function floorToStep(minutes: number, step: number) {
  return Math.floor(minutes / step) * step;
}

export const time = {
  DAY_MS,
  VN_OFFSET_MS,
};

type RelativeLabels = {
  justNow: string;
  minutesAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
  daysAgo: (count: number) => string;
};

/** "Vừa xong" / "5 phút trước" / … then an absolute "HH:mm dd/MM/yyyy" after a week. */
export function formatRelative(date: Date | null | undefined, labels: RelativeLabels, now = new Date()): string {
  if (!date) return '';
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return labels.justNow;
  if (minutes < 60) return labels.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return labels.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days < 7) return labels.daysAgo(days);
  return `${formatTime(date)} ${formatDate(date)}`;
}
