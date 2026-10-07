import { bookingBadgeKind, bookingDisplayKind, delegationBadgeKind, isBookingLive, parcelBadgeKind } from '../status';

describe('status → badge kind', () => {
  it('maps ParcelStatus (1 Waiting … 5 HandedOver)', () => {
    expect([1, 2, 3, 4, 5].map(parcelBadgeKind)).toEqual(['wait', 'warn', 'danger', 'off', 'ok']);
  });

  it('maps DelegationStatus, whose numbering runs the other way (1 Expired … 5 Waiting)', () => {
    expect([1, 2, 3, 4, 5].map(delegationBadgeKind)).toEqual(['off', 'warn', 'ok', 'danger', 'wait']);
  });

  it('maps BookingStatus; finished and cancelled are both "off"', () => {
    expect([1, 2, 3, 4, 5].map(bookingBadgeKind)).toEqual(['wait', 'ok', 'danger', 'off', 'off']);
  });

  it('falls back to "off" for unknown or missing values', () => {
    expect(parcelBadgeKind(99)).toBe('off');
    expect(delegationBadgeKind(undefined)).toBe('off');
    expect(bookingBadgeKind(null)).toBe('off');
  });
});

describe('isBookingLive ("Đang diễn ra")', () => {
  // 09:30–10:30 Vietnam time = 02:30–03:30 UTC.
  const booking = { status: 2, from: '2026-10-05T02:30:00Z', to: '2026-10-05T03:30:00Z' };

  it('is live for an approved booking while now is inside from–to', () => {
    expect(isBookingLive(booking, new Date('2026-10-05T02:30:00Z'))).toBe(true);
    expect(isBookingLive(booking, new Date('2026-10-05T03:29:59Z'))).toBe(true);
  });

  it('is not live before the start or from the end on', () => {
    expect(isBookingLive(booking, new Date('2026-10-05T02:29:59Z'))).toBe(false);
    expect(isBookingLive(booking, new Date('2026-10-05T03:30:00Z'))).toBe(false);
  });

  it('needs the Approved status: waiting or finished bookings are never live', () => {
    const now = new Date('2026-10-05T03:00:00Z');
    expect(isBookingLive({ ...booking, status: 1 }, now)).toBe(false);
    expect(isBookingLive({ ...booking, status: 4 }, now)).toBe(false);
  });

  it('accepts server dates without a zone suffix as UTC', () => {
    expect(isBookingLive({ status: 2, from: '2026-10-05T02:30:00', to: '2026-10-05T03:30:00' }, new Date('2026-10-05T03:00:00Z'))).toBe(true);
  });

  it('turns into the "live" kind for display, else the status kind', () => {
    expect(bookingDisplayKind(booking, new Date('2026-10-05T03:00:00Z'))).toBe('live');
    expect(bookingDisplayKind(booking, new Date('2026-10-05T05:00:00Z'))).toBe('ok');
  });
});
