import { CANCEL_DAY, OVERDUE_DAY, parcelDeadline, parcelTabs } from '../logic';
import { ParcelStatus } from '../types';

// Received 29/09 08:10 Vietnam time (01:10 UTC).
const parcel = { createdAt: '2026-09-29T01:10:00Z', receivedAt: '2026-09-29T01:10:00Z' };

describe('parcelDeadline', () => {
  it('counts from createdAt: due (overdue day) on day 7, auto-cancel around day 10', () => {
    const d = parcelDeadline(parcel, new Date('2026-10-05T03:00:00Z'))!;
    expect(d.startKey).toBe('2026-09-29');
    expect(d.dueKey).toBe('2026-10-06');
    expect(d.cancelKey).toBe('2026-10-09');
    expect(OVERDUE_DAY).toBe(7);
    expect(CANCEL_DAY).toBe(10);
  });

  it('gives calendar days left until the due day, negative once overdue', () => {
    expect(parcelDeadline(parcel, new Date('2026-10-05T03:00:00Z'))!.daysLeft).toBe(1);
    expect(parcelDeadline(parcel, new Date('2026-10-06T03:00:00Z'))!.daysLeft).toBe(0);
    expect(parcelDeadline(parcel, new Date('2026-10-08T03:00:00Z'))!.daysLeft).toBe(-2);
  });

  it('uses Vietnam days: 23:30 UTC on 05/10 is already 06/10 in Vietnam', () => {
    expect(parcelDeadline(parcel, new Date('2026-10-05T23:30:00Z'))!.daysLeft).toBe(0);
  });

  it('places progress on the 10-day lifecycle, clamped to [0.02, 1]', () => {
    expect(parcelDeadline(parcel, new Date('2026-09-29T01:10:00Z'))!.progress).toBe(0.02);
    expect(parcelDeadline(parcel, new Date('2026-10-04T01:10:00Z'))!.progress).toBeCloseTo(0.5);
    expect(parcelDeadline(parcel, new Date('2026-10-20T00:00:00Z'))!.progress).toBe(1);
  });

  it('fills the card bar on the way to the due day (day 7), full once overdue', () => {
    expect(parcelDeadline(parcel, new Date('2026-10-05T01:10:00Z'))!.dueProgress).toBeCloseTo(6 / 7);
    expect(parcelDeadline(parcel, new Date('2026-10-08T01:10:00Z'))!.dueProgress).toBe(1);
  });

  it('falls back to receivedAt when the lookup has no createdAt, and to null without dates', () => {
    expect(parcelDeadline({ receivedAt: parcel.receivedAt }, new Date('2026-10-05T03:00:00Z'))!.dueKey).toBe('2026-10-06');
    expect(parcelDeadline({}, new Date())).toBeNull();
  });
});

describe('parcelTabs', () => {
  it('"Chờ nhận" covers Waiting and Due; the other tabs one status each', () => {
    expect(parcelTabs.pending).toEqual([ParcelStatus.Waiting, ParcelStatus.Due]);
    expect(parcelTabs.overdue).toEqual([ParcelStatus.Overdue]);
    expect(parcelTabs.handed).toEqual([ParcelStatus.HandedOver]);
    expect(parcelTabs.cancelled).toEqual([ParcelStatus.Cancelled]);
  });
});
