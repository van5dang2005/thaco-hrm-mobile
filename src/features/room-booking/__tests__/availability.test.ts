import { buildSlots, nextRange, rangeFromMinutes, roomNow, type Busy, type Slot } from '../availability';

const h = (hour: number, minute = 0) => hour * 60 + minute;
const states = (slots: Slot[]) => slots.map((s) => s.state[0]).join('');

describe('buildSlots', () => {
  it('builds 30-minute slots that end by closing time', () => {
    const slots = buildSlots({ open: h(8), close: h(10, 15), busy: [], blockPending: false });
    expect(slots.map((s) => s.startMin)).toEqual([h(8), h(8, 30), h(9), h(9, 30)]);
  });

  it('marks approved as taken, waiting as pending, and the past as past', () => {
    const busy: Busy[] = [
      { startMin: h(9), endMin: h(10), kind: 'approved' },
      { startMin: h(10, 30), endMin: h(11), kind: 'pending' },
    ];
    const slots = buildSlots({ open: h(8), close: h(11), busy, blockPending: false, nowMin: h(8, 10) });
    // 08:00 past · 08:30 free · 09:00 09:30 taken · 10:00 free · 10:30 pending
    expect(states(slots)).toBe('pfttfp');
  });

  it('treats waiting bookings as taken when the room refuses overlaps', () => {
    const busy: Busy[] = [{ startMin: h(8), endMin: h(8, 30), kind: 'pending' }];
    expect(states(buildSlots({ open: h(8), close: h(9), busy, blockPending: true }))).toBe('tf');
  });
});

describe('nextRange', () => {
  // 0 free · 1 free · 2 taken · 3 free · 4 pending · 5 free
  const slots: Slot[] = [
    { startMin: h(8), state: 'free' },
    { startMin: h(8, 30), state: 'free' },
    { startMin: h(9), state: 'taken' },
    { startMin: h(9, 30), state: 'free' },
    { startMin: h(10), state: 'pending' },
    { startMin: h(10, 30), state: 'free' },
  ];

  it('first tap picks a single start slot', () => {
    expect(nextRange(null, 3, slots)).toEqual({ start: 3, end: 3 });
  });

  it('second tap on a later slot extends the range, pending slots included', () => {
    expect(nextRange({ start: 3, end: 3 }, 5, slots)).toEqual({ start: 3, end: 5 });
  });

  it('does not extend across a taken slot: the tap becomes the new start', () => {
    expect(nextRange({ start: 0, end: 0 }, 3, slots)).toEqual({ start: 3, end: 3 });
  });

  it('a tap before the start moves the start', () => {
    expect(nextRange({ start: 3, end: 3 }, 0, slots)).toEqual({ start: 0, end: 0 });
  });

  it('after a full range, the next tap starts over', () => {
    expect(nextRange({ start: 3, end: 5 }, 4, slots)).toEqual({ start: 4, end: 4 });
  });

  it('ignores taps on taken or past slots', () => {
    const current = { start: 0, end: 1 };
    expect(nextRange(current, 2, slots)).toBe(current);
    expect(nextRange(null, 2, slots)).toBeNull();
  });
});

describe('rangeFromMinutes', () => {
  const slots = buildSlots({ open: h(8), close: h(11), busy: [{ startMin: h(9), endMin: h(9, 30), kind: 'approved' }], blockPending: false });

  it('maps draft times onto slot indexes', () => {
    expect(rangeFromMinutes(slots, h(9, 30), h(10, 30))).toEqual({ start: 3, end: 4 });
  });

  it('returns null when the range is not bookable or off-grid', () => {
    expect(rangeFromMinutes(slots, h(8, 30), h(9, 30))).toBeNull();
    expect(rangeFromMinutes(slots, h(8, 15), h(9))).toBeNull();
  });
});

describe('roomNow ("Trống đến hh:mm")', () => {
  const busy: Busy[] = [
    { startMin: h(9, 30), endMin: h(10, 30), kind: 'approved' },
    { startMin: h(10, 30), endMin: h(11, 30), kind: 'approved' },
    { startMin: h(14), endMin: h(15), kind: 'approved' },
  ];

  it('is free until the next booking', () => {
    expect(roomNow(busy, h(8), h(18), h(9, 12))).toEqual({ kind: 'free', until: h(9, 30) });
  });

  it('is busy until the end of back-to-back bookings', () => {
    expect(roomNow(busy, h(8), h(18), h(10))).toEqual({ kind: 'busy', until: h(11, 30) });
  });

  it('is free until closing time after the last booking', () => {
    expect(roomNow(busy, h(8), h(18), h(15, 30))).toEqual({ kind: 'free', until: h(18) });
  });

  it('reads from opening time before the room opens', () => {
    expect(roomNow([{ startMin: h(8), endMin: h(9), kind: 'approved' }], h(8), h(18), h(7))).toEqual({ kind: 'busy', until: h(9) });
  });

  it('is closed at or after closing time', () => {
    expect(roomNow(busy, h(8), h(18), h(18))).toEqual({ kind: 'closed' });
  });
});
