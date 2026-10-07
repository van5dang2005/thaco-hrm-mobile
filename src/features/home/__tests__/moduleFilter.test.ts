import type { Capability } from '@/core/session/capabilities';

import { type AccessContext, canSeeModule, filterModules, groupModules } from '../moduleFilter';
import type { HomeModule } from '../modules';

type TestModule = Pick<HomeModule, 'id' | 'group' | 'permission'>;

const modules: TestModule[] = [
  { id: 'book-room', group: 'meeting', permission: { service: 'room' } },
  { id: 'parcels', group: 'parcel', permission: { service: 'parcel' } },
  { id: 'reception', group: 'parcel', permission: { service: 'parcel', capability: 'parcel.reception' } },
  { id: 'directory', group: 'meeting' },
  { id: 'leave', group: 'hr' },
];

const ctx = (connected: Partial<AccessContext['connected']>, capabilities: Capability[] = []): AccessContext => ({
  connected: { parcel: false, room: false, ...connected },
  has: (capability) => capabilities.includes(capability),
});

const ids = (list: TestModule[]) => list.map((m) => m.id);

describe('filterModules', () => {
  it('shows everything to a user connected to both services with reception rights', () => {
    expect(ids(filterModules(modules, ctx({ parcel: true, room: true }, ['parcel.reception'])))).toEqual([
      'book-room',
      'parcels',
      'reception',
      'directory',
      'leave',
    ]);
  });

  it('hides modules that need a missing capability', () => {
    expect(ids(filterModules(modules, ctx({ parcel: true, room: true })))).toEqual(['book-room', 'parcels', 'directory', 'leave']);
  });

  it('hides modules of a service that is not connected, even with the capability', () => {
    expect(ids(filterModules(modules, ctx({ room: true }, ['parcel.reception'])))).toEqual(['book-room', 'directory', 'leave']);
  });

  it('always shows modules without a permission', () => {
    expect(ids(filterModules(modules, ctx({})))).toEqual(['directory', 'leave']);
    expect(canSeeModule({ permission: undefined }, ctx({}))).toBe(true);
  });

  it('keeps config order', () => {
    const reversed = [...modules].reverse();
    expect(ids(filterModules(reversed, ctx({ parcel: true, room: true }, ['parcel.reception'])))).toEqual(ids(reversed));
  });
});

describe('groupModules', () => {
  it('groups in the given order and skips empty groups', () => {
    const visible = filterModules(modules, ctx({ parcel: true }));
    expect(groupModules(visible, ['meeting', 'parcel', 'hr']).map((g) => [g.group, ids(g.modules)])).toEqual([
      ['meeting', ['directory']],
      ['parcel', ['parcels']],
      ['hr', ['leave']],
    ]);
    expect(groupModules(filterModules(modules, ctx({})), ['meeting', 'parcel', 'hr']).map((g) => g.group)).toEqual(['meeting', 'hr']);
  });
});
