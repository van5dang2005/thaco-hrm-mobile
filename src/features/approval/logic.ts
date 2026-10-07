import { addDays, parseDateKey, todayKey, weekdayOf, type DateKey } from '@/core/time/vn';

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
