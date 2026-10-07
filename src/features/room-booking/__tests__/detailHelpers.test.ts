import { blockTime, isRoomBusy, levelProgress, type StepView, type TimelineBlock } from '../logic';

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
