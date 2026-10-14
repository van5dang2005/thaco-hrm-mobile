/**
 * Pure helpers behind the new booking screens (4a, 4b): 30-minute slot grid, range picking and
 * "Trống đến hh:mm" status. Minutes are Vietnam wall-clock minutes since midnight.
 */

export const SLOT_MINUTES = 30;

/** A booked interval of one room on one day. */
export type Busy = { startMin: number; endMin: number; kind: 'approved' | 'pending' };

/**
 * - `free`: bookable.
 * - `pending`: only waiting bookings overlap and the room allows overlapping requests: still
 *   bookable, but whichever request is approved first auto-cancels the other.
 * - `taken`: an approved booking (or a waiting one in a room that refuses overlaps) overlaps.
 * - `past`: starts at or before now.
 */
export type SlotState = 'free' | 'pending' | 'taken' | 'past';

export type Slot = { startMin: number; state: SlotState };

/** Inclusive slot indexes. `start === end` is a single 30-minute slot. */
export type SlotRange = { start: number; end: number };

const overlaps = (b: Busy, start: number, end: number) => b.startMin < end && b.endMin > start;

/**
 * Slots from opening to closing time. A slot is only offered when it ends by closing time, because
 * the server rejects bookings that run past `closedAt`.
 */
export function buildSlots({
  open,
  close,
  busy,
  blockPending,
  nowMin,
}: {
  open: number;
  close: number;
  busy: Busy[];
  /** Room has `isDisableOverlappingTimes`: waiting bookings block the slot too. */
  blockPending: boolean;
  /** Minutes now when the day is today; null/undefined for other days. */
  nowMin?: number | null;
}): Slot[] {
  const slots: Slot[] = [];
  for (let start = open; start + SLOT_MINUTES <= close; start += SLOT_MINUTES) {
    const end = start + SLOT_MINUTES;
    const hits = busy.filter((b) => overlaps(b, start, end));
    let state: SlotState = 'free';
    if (nowMin != null && start <= nowMin) state = 'past';
    else if (hits.some((b) => b.kind === 'approved' || blockPending)) state = 'taken';
    else if (hits.length) state = 'pending';
    slots.push({ startMin: start, state });
  }
  return slots;
}

export const isPickable = (slot: Slot | undefined) => !!slot && (slot.state === 'free' || slot.state === 'pending');

/**
 * SlotGrid tap rule. The first tap picks a start slot (a valid 30-minute range on its own). A second
 * tap on a later slot extends the range to it when every slot in between is bookable; any other tap
 * starts a new range. Taps on unbookable slots are ignored.
 */
export function nextRange(current: SlotRange | null, index: number, slots: Slot[]): SlotRange | null {
  if (!isPickable(slots[index])) return current;
  const awaitingEnd = current && current.start === current.end;
  if (awaitingEnd && index > current.start && slots.slice(current.start, index + 1).every(isPickable)) {
    return { start: current.start, end: index };
  }
  return { start: index, end: index };
}

/** Range of the draft's times in the grid, or null when they do not match bookable slots. */
export function rangeFromMinutes(slots: Slot[], startMin: number, endMin: number): SlotRange | null {
  const start = slots.findIndex((s) => s.startMin === startMin);
  const end = slots.findIndex((s) => s.startMin + SLOT_MINUTES === endMin);
  if (start < 0 || end < start) return null;
  return slots.slice(start, end + 1).every(isPickable) ? { start, end } : null;
}

export const rangeMinutes = (slots: Slot[], range: SlotRange) => ({
  startMin: slots[range.start].startMin,
  endMin: slots[range.end].startMin + SLOT_MINUTES,
});

export type RoomNow = { kind: 'free'; until: number } | { kind: 'busy'; until: number } | { kind: 'closed' };

/**
 * Status pill of a room card (4a): "Trống đến 09:30" / "Đang họp · 11:30". `busy` must only hold
 * intervals that really block the room. Before opening time the status is read from opening time;
 * back-to-back meetings count as one busy stretch.
 */
export function roomNow(busy: Busy[], open: number, close: number, nowMin: number): RoomNow {
  if (nowMin >= close) return { kind: 'closed' };
  const ref = Math.max(nowMin, open);
  const sorted = [...busy].filter((b) => b.endMin > ref).sort((a, b) => a.startMin - b.startMin);

  const current = sorted.find((b) => b.startMin <= ref && ref < b.endMin);
  if (current) {
    let until = current.endMin;
    for (const b of sorted) if (b.startMin <= until && b.endMin > until) until = b.endMin;
    return { kind: 'busy', until: Math.min(until, close) };
  }
  const next = sorted.find((b) => b.startMin > ref);
  return { kind: 'free', until: Math.min(next?.startMin ?? close, close) };
}

/** 1 giờ 30 phút → { hours: 1, minutes: 30 }. */
export function splitDuration(minutes: number) {
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

/** Timeline blocks (`roomDayBlocks`) as busy intervals: approved/finished vs waiting. */
export function busyFromBlocks(blocks: { kind: 'approved' | 'pending' | 'cluster' | 'finished'; startMin: number; endMin: number }[]): Busy[] {
  return blocks.map((b) => ({ startMin: b.startMin, endMin: b.endMin, kind: b.kind === 'approved' || b.kind === 'finished' ? 'approved' : 'pending' }));
}

/** Intervals that make a room unavailable: waiting bookings only count when the room refuses overlaps. */
export const blockingBusy = (busy: Busy[], blockPending: boolean) => busy.filter((b) => b.kind === 'approved' || blockPending);
