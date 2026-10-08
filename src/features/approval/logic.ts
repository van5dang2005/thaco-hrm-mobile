import { addDays, parseDateKey, parseServerDate, todayKey, toDateKey, weekdayOf, type DateKey } from '@/core/time/vn';

/** "Hôm nay · T2 05/10", "Ngày mai · T3 06/10", otherwise "T4 07/10". `t` resolves the i18n keys. */
export function dayGroupTitle(key: DateKey, t: (key: string) => string, today: DateKey = todayKey()): string {
  const { day, month } = parseDateKey(key);
  const date = `${t(`time.weekdayShort.${weekdayOf(key)}`)} ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
  if (key === today) return `${t('myMeetings.today')} · ${date}`;
  if (key === addDays(today, 1)) return `${t('myMeetings.tomorrow')} · ${date}`;
  return date;
}

/** Group already-sorted items by the day returned by `keyOf`, keeping first-seen order. */
export function groupByDay<T>(items: T[], keyOf: (item: T) => DateKey): { key: DateKey; data: T[] }[] {
  const groups: { key: DateKey; data: T[] }[] = [];
  items.forEach((item) => {
    const key = keyOf(item);
    const group = groups.find((g) => g.key === key);
    if (group) group.data.push(item);
    else groups.push({ key, data: [item] });
  });
  return groups;
}

type Timed = { from?: string | null; to?: string | null };

/** my-approvals aggregates a series into one row: `from` is the first session and `to` the last one. */
export function isSeries(b?: Timed | null) {
  const from = parseServerDate(b?.from);
  const to = parseServerDate(b?.to);
  return !!from && !!to && toDateKey(from) !== toDateKey(to);
}

/** Minutes until `from` when it starts within `withinMinutes` from now ("Còn 5 giờ"), otherwise null. */
export function startsWithin(from: Date | null | undefined, now: Date, withinMinutes: number): number | null {
  if (!from) return null;
  const minutes = Math.round((from.getTime() - now.getTime()) / 60_000);
  return minutes > 0 && minutes <= withinMinutes ? minutes : null;
}
