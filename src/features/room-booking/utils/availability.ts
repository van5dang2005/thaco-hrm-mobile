/**
 * Pure helpers behind the new booking screens (4a, 4b): 30-minute slot grid, range picking and
 * "Trống đến hh:mm" status. Minutes are Vietnam wall-clock minutes since midnight.
 */

export const SLOT_MINUTES = 30;

/** Hours the app offers for booking (B2 slots) and shows on the room calendar, within each room's own opening hours. */
export const BOOKING_HOURS = { start: 7, end: 20 };

/** A booked interval of one room on one day. */
export type Busy = { startMin: number; endMin: number; kind: 'approved' | 'pending' };

/**
 * - `free`: bookable.
 * - `pending`: only waiting bookings overlap and the room allows overlapping requests: still
 *   bookable, but whichever request is approved first auto-cancels the other.
 * - `taken`: an approved booking (or a waiting one in a room that refuses overlaps) overlaps.
 * - `past`: starts at or before now.
 * - `closed`: outside the room's opening hours.
 */
export type SlotState = 'free' | 'pending' | 'taken' | 'past' | 'closed';

export type Slot = { startMin: number; state: SlotState };

/**
 * Inclusive slot indexes. `start === end` is a single 30-minute slot. `awaitingEnd`: only the start
 * time has been tapped so far (the range is its 30-minute default).
 */
export type SlotRange = { start: number; end: number; awaitingEnd?: boolean };

const overlaps = (b: Busy, start: number, end: number) => b.startMin < end && b.endMin > start;

/**
 * Slots from `from` to `to` (the booking window). Slots outside the room's opening hours are shown
 * as `closed`, because the server rejects bookings that start before `openedAt` or run past `closedAt`.
 */
export function buildSlots({
  from,
  to,
  open,
  close,
  busy,
  blockPending,
  nowMin,
}: {
  from: number;
  to: number;
  open: number;
  close: number;
  busy: Busy[];
  /** Room has `isDisableOverlappingTimes`: waiting bookings block the slot too. */
  blockPending: boolean;
  /** Minutes now when the day is today; null/undefined for other days. */
  nowMin?: number | null;
}): Slot[] {
  const slots: Slot[] = [];
  for (let start = from; start + SLOT_MINUTES <= to; start += SLOT_MINUTES) {
    const end = start + SLOT_MINUTES;
    const hits = busy.filter((b) => overlaps(b, start, end));
    let state: SlotState = 'free';
    if (nowMin != null && start <= nowMin) state = 'past';
    else if (start < open || end > close) state = 'closed';
    else if (hits.some((b) => b.kind === 'approved' || blockPending)) state = 'taken';
    else if (hits.length) state = 'pending';
    slots.push({ startMin: start, state });
  }
  return slots;
}

export const isPickable = (slot: Slot | undefined) => !!slot && (slot.state === 'free' || slot.state === 'pending');

/**
 * The grid shows time points, not slots: point `i < slots.length` is the start of slot `i`, the last
 * point is the end of the last slot (closing time). A booking runs from one tapped point to another.
 */
export const pointMinute = (slots: Slot[], point: number) =>
  point < slots.length ? slots[point].startMin : slots[slots.length - 1].startMin + SLOT_MINUTES;

/** Can `point` end the range that starts at `range.start`? Every slot in between must be bookable. */
function canEndAt(range: SlotRange | null, point: number, slots: Slot[]) {
  return !!range?.awaitingEnd && point > range.start && slots.slice(range.start, point).every(isPickable);
}

/**
 * A point is tappable when it can end the range being picked, start a new one, or end the 30 minutes
 * before it (closing time, or a time right before a taken slot).
 */
export const isPointPickable = (range: SlotRange | null, point: number, slots: Slot[]) =>
  canEndAt(range, point, slots) || isPickable(slots[point]) || isPickable(slots[point - 1]);

/**
 * SlotGrid tap rule. The first tap picks the start time (30 minutes by default). A second tap on a
 * later time ends the range there when every slot in between is bookable; any other tap starts a new
 * range. A time that cannot start a meeting (closing time, or right before a taken slot) picks the
 * 30 minutes ending there. Taps on unbookable times are ignored.
 */
export function nextRange(current: SlotRange | null, point: number, slots: Slot[]): SlotRange | null {
  if (canEndAt(current, point, slots)) return { start: current!.start, end: point - 1 };
  if (isPickable(slots[point])) return { start: point, end: point, awaitingEnd: true };
  if (isPickable(slots[point - 1])) return { start: point - 1, end: point - 1 };
  return current;
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
