import type { Capability } from '@/core/session/capabilities';
import type { MyApp } from '@/core/session/myApps';
import type { AppIcon } from '@/shared/ui/icons';

import { type AccessContext, appModules, canSeeModule, filterModules, groupModules, webModule } from '../moduleFilter';
import type { HomeModule } from '../modules';

type TestModule = Pick<HomeModule, 'id' | 'group' | 'permission'>;

const modules: TestModule[] = [
  { id: 'book-room', group: 'meeting', permission: { service: 'room' } },
  { id: 'parcels', group: 'parcel', permission: { service: 'parcel' } },
  { id: 'reception', group: 'parcel', permission: { service: 'parcel', capability: 'parcel.reception' } },
  { id: 'app:VANTHU', group: 'other' },
];

const ctx = (connected: Partial<AccessContext['connected']>, capabilities: Capability[] = []): AccessContext => ({
  connected: { parcel: false, room: false, ...connected },
  has: (capability) => capabilities.includes(capability),
});

const ids = (list: Pick<HomeModule, 'id'>[]) => list.map((m) => m.id);

describe('filterModules', () => {
  it('shows everything to a user connected to both services with reception rights', () => {
    expect(ids(filterModules(modules, ctx({ parcel: true, room: true }, ['parcel.reception'])))).toEqual(['book-room', 'parcels', 'reception', 'app:VANTHU']);
  });

  it('hides modules that need a missing capability', () => {
    expect(ids(filterModules(modules, ctx({ parcel: true, room: true })))).toEqual(['book-room', 'parcels', 'app:VANTHU']);
  });

  it('hides modules of a service that is not connected, even with the capability', () => {
    expect(ids(filterModules(modules, ctx({ room: true }, ['parcel.reception'])))).toEqual(['book-room', 'app:VANTHU']);
  });

  it('always shows modules without a permission', () => {
    expect(ids(filterModules(modules, ctx({})))).toEqual(['app:VANTHU']);
    expect(canSeeModule({ permission: undefined }, ctx({}))).toBe(true);
  });

  it('keeps config order', () => {
    const reversed = [...modules].reverse();
    expect(ids(filterModules(reversed, ctx({ parcel: true, room: true }, ['parcel.reception'])))).toEqual(ids(reversed));
  });
});

describe('groupModules', () => {
  it('groups in the order of their first module and skips empty groups', () => {
    const visible = filterModules(modules, ctx({ parcel: true }));
    expect(groupModules(visible).map((g) => [g.group, ids(g.modules)])).toEqual([
      ['parcel', ['parcels']],
      ['other', ['app:VANTHU']],
    ]);
    expect(groupModules([...modules].reverse()).map((g) => [g.group, ids(g.modules)])).toEqual([
      ['other', ['app:VANTHU']],
      ['parcel', ['reception', 'parcels']],
      ['meeting', ['book-room']],
    ]);
  });
});

const icon = (() => null) as unknown as AppIcon;

const native: HomeModule[] = [
  { id: 'book-room', group: 'meeting', labelKey: 'bookRoom', icon, permission: { service: 'room' } },
  { id: 'approve-rooms', group: 'meeting', labelKey: 'approveRooms', icon, permission: { service: 'room' } },
  { id: 'parcels', group: 'parcel', labelKey: 'parcels', icon, permission: { service: 'parcel' } },
];

const app = (code: string, fields: Partial<MyApp> = {}): MyApp => ({ id: code, code, name: code, ...fields });

describe('appModules', () => {
  it('lists the tiles of the apps with screens here in portal order, then one tile per other app', () => {
    const apps = [
      app('VANTHU', { displayOrder: 1, url: 'https://vanthu.thaco.com.vn' }),
      app('PARCEL_MANAGEMENT_WEB', { displayOrder: 3 }),
      app('BOOKING_ROOM_WEB', { displayOrder: 2 }),
      app('ESIGN_WEB', { url: 'https://esign.thaco.com.vn' }),
    ];
    expect(ids(appModules(apps, native))).toEqual(['book-room', 'approve-rooms', 'parcels', 'app:VANTHU', 'app:ESIGN_WEB']);
  });

  it('leaves out the tiles of a back-end the portal does not grant', () => {
    expect(ids(appModules([app('BOOKING_ROOM_WEB')], native))).toEqual(['book-room', 'approve-rooms']);
  });

  it('has no tiles while the portal list is unknown or empty', () => {
    expect(appModules(null, native)).toEqual([]);
    expect(appModules([], native)).toEqual([]);
  });

  it('counts an app listed twice once', () => {
    const vanthu = app('VANTHU', { url: 'https://vanthu.thaco.com.vn' });
    expect(ids(appModules([app('PARCEL_MANAGEMENT_WEB'), vanthu, app('PARCEL_MANAGEMENT_WEB'), vanthu], native))).toEqual(['parcels', 'app:VANTHU']);
  });

  it('opens an app on the web when its back-end has no tiles', () => {
    expect(ids(appModules([app('BOOKING_ROOM_WEB', { url: 'https://datphonghop.thaco.com.vn' })], []))).toEqual(['app:BOOKING_ROOM_WEB']);
  });
});

describe('webModule', () => {
  it('opens the web app under the portal name and icon', () => {
    const tile = webModule(app('VANTHU', { name: ' Văn thư ', url: ' https://vanthu.thaco.com.vn ', icon: 'https://apps.thaco.com.vn/icons/vanthu.svg' }));
    expect(tile).toMatchObject({
      id: 'app:VANTHU',
      group: 'other',
      title: 'Văn thư',
      externalUrl: 'https://vanthu.thaco.com.vn',
      iconUrl: 'https://apps.thaco.com.vn/icons/vanthu.svg',
    });
  });

  it('falls back to the code without a name and to the lucide icon without an image', () => {
    const tile = webModule(app('ESIGN_WEB', { name: '', url: 'https://esign.thaco.com.vn', icon: null }));
    expect(tile?.title).toBe('ESIGN_WEB');
    expect(tile?.iconUrl).toBeUndefined();
  });

  it('skips an app with nothing the device can open', () => {
    expect(webModule(app('A'))).toBeNull();
    expect(webModule(app('B', { url: '  ' }))).toBeNull();
    expect(webModule(app('C', { url: '/vanthu' }))).toBeNull();
  });
});
