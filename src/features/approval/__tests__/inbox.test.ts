import { isSeries, startsWithin } from '../logic';

describe('inbox helpers (5a)', () => {
  it('treats a row spanning several days as a series', () => {
    expect(isSeries({ from: '2026-10-05T07:00:00Z', to: '2026-11-02T08:30:00Z' })).toBe(true);
    expect(isSeries({ from: '2026-10-05T07:00:00Z', to: '2026-10-05T08:30:00Z' })).toBe(false);
    expect(isSeries(null)).toBe(false);
  });

  it('flags meetings that start soon', () => {
    const now = new Date('2026-10-05T02:00:00Z');
    expect(startsWithin(new Date('2026-10-05T07:00:00Z'), now, 24 * 60)).toBe(300);
    expect(startsWithin(new Date('2026-10-07T07:00:00Z'), now, 24 * 60)).toBeNull();
    expect(startsWithin(new Date('2026-10-05T01:00:00Z'), now, 24 * 60)).toBeNull();
  });
});
