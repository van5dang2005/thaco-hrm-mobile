import { grantedServices, sortApps } from '../myApps';

describe('grantedServices', () => {
  it('turns on the back-ends whose portal code the account has', () => {
    expect(grantedServices([{ code: 'BOOKING_ROOM_WEB' }, { code: 'VANTHU' }])).toEqual({ parcel: false, room: true });
    expect(grantedServices([{ code: 'PARCEL_MANAGEMENT_WEB' }, { code: 'BOOKING_ROOM_WEB' }])).toEqual({ parcel: true, room: true });
  });

  it('turns every back-end off while the list is unknown or empty', () => {
    expect(grantedServices(null)).toEqual({ parcel: false, room: false });
    expect(grantedServices([])).toEqual({ parcel: false, room: false });
  });
});

describe('sortApps', () => {
  it('orders by displayOrder, unset last, ties as listed', () => {
    const apps = [{ code: 'a' }, { code: 'b', displayOrder: 2 }, { code: 'c', displayOrder: 1 }, { code: 'd', displayOrder: 2 }, { code: 'e', displayOrder: null }];
    expect(sortApps(apps).map((app) => app.code)).toEqual(['c', 'b', 'd', 'a', 'e']);
  });
});
