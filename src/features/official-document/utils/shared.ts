import { diffDays, todayKey, type DateKey } from '@/core/time/vn';

import type { SharedDoc, SharedKind } from '../types';

/** Filter chips of "Văn bản được chia sẻ" (8g). */
export type SharedFilter = 'tat_ca' | 'chua_xem' | 'theo_doi';

export const SHARED_FILTERS: readonly SharedFilter[] = ['tat_ca', 'chua_xem', 'theo_doi'];

export function isSharedFilter(value: unknown): value is SharedFilter {
  return typeof value === 'string' && (SHARED_FILTERS as readonly string[]).includes(value);
}

export function isSharedKind(value: unknown): value is SharedKind {
  return value === 'di' || value === 'noi_bo';
}

/** Unread only counts for documents still in force: a cancelled one needs no attention. */
export function isUnread(doc: SharedDoc) {
  return !doc.daXem && !doc.daHuy;
}

export function matchesSharedFilter(doc: SharedDoc, filter: SharedFilter) {
  switch (filter) {
    case 'tat_ca':
      return true;
    case 'chua_xem':
      return isUnread(doc);
    case 'theo_doi':
      return !!doc.hanPhanHoi && !doc.daHuy;
  }
}

export function sharedFilterCounts(docs: readonly SharedDoc[]): Record<SharedFilter, number> {
  return {
    tat_ca: docs.length,
    chua_xem: docs.filter((d) => matchesSharedFilter(d, 'chua_xem')).length,
    theo_doi: docs.filter((d) => matchesSharedFilter(d, 'theo_doi')).length,
  };
}

export type SharedGroup = { key: 'today' | 'recent' | 'older'; docs: SharedDoc[] };

/** "Mới hôm nay" / "30 ngày qua" / older, newest first; empty groups are dropped. */
export function groupShared(docs: readonly SharedDoc[], today: DateKey = todayKey()): SharedGroup[] {
  const sorted = [...docs].sort((a, b) => b.ngayGui.localeCompare(a.ngayGui) || b.soHieu.localeCompare(a.soHieu));
  const groups: SharedGroup[] = [
    { key: 'today', docs: sorted.filter((d) => d.ngayGui === today) },
    { key: 'recent', docs: sorted.filter((d) => d.ngayGui !== today && diffDays(d.ngayGui, today) <= 30) },
    { key: 'older', docs: sorted.filter((d) => diffDays(d.ngayGui, today) > 30) },
  ];
  return groups.filter((g) => g.docs.length > 0);
}
