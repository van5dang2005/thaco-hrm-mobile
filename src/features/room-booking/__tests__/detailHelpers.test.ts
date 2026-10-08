import { allExtendDeltas, blockTime, extendOptions, freeUntil, isRoomBusy, levelProgress, type StepView, type TimelineBlock } from '../logic';
import { BookingStatus } from '../types';

const step = (order: number, state: StepView['state']): StepView => ({ key: `${order}-${state}`, order, state, handlers: [] });

describe('levelProgress ("Cấp n/N")', () => {
  it('points at the level being decided', () => {
    expect(levelProgress([step(1, 'approved'), step(2, 'pending'), step(3, 'notify')])).toEqual({ current: 2, total: 2 });
  });

  it('stays on the last approved level when nothing is pending', () => {
    expect(levelProgress([step(1, 'approved'), step(2, 'approved')])).toEqual({ current: 2, total: 2 });
  });

  it('points at the rejecting level', () => {
    expect(levelProgress([step(1, 'rejected'), step(2, 'future')])).toEqual({ current: 1, total: 2 });
  });

  it('ignores notification steps and returns null without approval levels', () => {
    expect(levelProgress([step(1, 'notify')])).toBeNull();
    expect(levelProgress([])).toBeNull();
  });
});

describe('room schedule blocks', () => {
  const block = (kind: TimelineBlock['kind'], startMin: number, endMin: number): TimelineBlock => ({ key: `${kind}-${startMin}`, kind, bookings: [], startMin, endMin });

  it('shows only the start time for blocks up to one hour, the range for longer ones', () => {
    expect(blockTime({ startMin: 9 * 60 + 30, endMin: 10 * 60 + 30 })).toBe('09:30');
    expect(blockTime({ startMin: 10 * 60, endMin: 11 * 60 + 30 })).toBe('10:00–11:30');
  });

  it('marks a room busy only while an approved (or finished) booking covers now', () => {
    const blocks = [block('approved', 9 * 60, 10 * 60), block('pending', 11 * 60, 12 * 60)];
    expect(isRoomBusy(blocks, 9 * 60 + 15)).toBe(true);
    expect(isRoomBusy(blocks, 10 * 60)).toBe(false);
    expect(isRoomBusy(blocks, 11 * 60 + 15)).toBe(false);
  });
});

describe('extension helpers (6c)', () => {
  // 09:30–10:30 on 05/10/2026 in Chu Lai 1 (Vietnam time = UTC+7).
  const room = { id: 'r1', closedAt: '18:00:00', isDisableOverlappingTimes: false } as never;
  const meeting = { id: 'b1', roomId: 'r1', status: BookingStatus.Approved, from: '2026-10-05T02:30:00Z', to: '2026-10-05T03:30:00Z' } as never;
  const next = { id: 'b2', roomId: 'r1', status: BookingStatus.Approved, from: '2026-10-05T04:00:00Z', to: '2026-10-05T05:00:00Z' } as never;

  it('strikes out choices that run into the next approved booking', () => {
    expect(extendOptions(meeting, room, [next])).toEqual([
      { minutes: 10 * 60 + 45, taken: false },
      { minutes: 11 * 60, taken: false },
      { minutes: 11 * 60 + 30, taken: true },
      { minutes: 12 * 60, taken: true },
    ]);
  });

  it('knows until when the room stays free', () => {
    expect(freeUntil(meeting, room, [next])).toBe(11 * 60);
    expect(freeUntil(meeting, room, [])).toBe(18 * 60);
  });

  it('offers every quarter hour up to closing for "Khác"', () => {
    const deltas = allExtendDeltas(meeting, room);
    expect(deltas[0]).toBe(15);
    expect(deltas[deltas.length - 1]).toBe(7 * 60 + 30);
  });
});
