import type { ServiceId } from '@/core/api/ApiError';
import type { Capability } from '@/core/session/capabilities';
import { type MyApp, serviceAppCodes, sortApps } from '@/core/session/myApps';
import { AppWindowIcon } from '@/shared/ui/icons';

import type { HomeModule, ModuleGroup } from '../modules';

export type AccessContext = {
  connected: Record<ServiceId, boolean>;
  has: (capability: Capability) => boolean;
};

export function canSeeModule(module: Pick<HomeModule, 'permission'>, ctx: AccessContext) {
  const permission = module.permission;
  if (!permission) return true;
  if (!ctx.connected[permission.service]) return false;
  return !permission.capability || ctx.has(permission.capability);
}

/** Modules the user may see, in config order. */
export function filterModules<M extends Pick<HomeModule, 'permission'>>(modules: readonly M[], ctx: AccessContext): M[] {
  return modules.filter((module) => canSeeModule(module, ctx));
}

/** The device can open it: it names a scheme (`https:`, `thacopaytime:`…), unlike a path relative to the portal. */
const OPENABLE_URL = /^[a-z][a-z\d+.-]*:/i;

/** Portal names lead with the kind of thing ("Phần mềm Quản lý bưu phẩm", "PM Văn Thư"). */
const SOFTWARE_LEAD = /^(phần\s+mềm|pm)\s+/i;

/** `name` without its "Phần mềm" / "PM" lead, first letter raised: "Văn Thư"; `name` itself when nothing is left. */
export function shortAppName(name: string) {
  const short = name.replace(SOFTWARE_LEAD, '').trim();
  return short ? short.charAt(0).toUpperCase() + short.slice(1) : name;
}

/** Tile of a granted app without screens here: its web app (`url`) under the portal's name and icon; `null` with nothing to open. */
export function webModule(app: MyApp): HomeModule | null {
  const url = app.url?.trim();
  if (!url || !OPENABLE_URL.test(url)) return null;
  const title = app.name?.trim() || app.code;
  return {
    id: `app:${app.code}`,
    group: 'other',
    title,
    shortTitle: shortAppName(title),
    icon: AppWindowIcon,
    iconUrl: app.icon?.trim() || undefined,
    description: app.description?.trim() || undefined,
    externalUrl: url,
  };
}

/**
 * Home tiles of the portal's `apps`: the `native` tiles of each app with screens here, in portal order, then a
 * `webModule` for every other app (also one whose back-end has no tiles yet). An app listed twice counts once.
 */
export function appModules(apps: readonly MyApp[] | null, native: readonly HomeModule[]): HomeModule[] {
  const seen = new Set<string>();
  const own: HomeModule[] = [];
  const web: HomeModule[] = [];
  for (const app of sortApps(apps ?? [])) {
    if (seen.has(app.code)) continue;
    seen.add(app.code);
    const tiles = native.filter((module) => module.permission && serviceAppCodes[module.permission.service] === app.code);
    const tile = tiles.length ? null : webModule(app);
    own.push(...tiles);
    if (tile) web.push(tile);
  }
  return [...own, ...web];
}

/** Non-empty groups in the order of their first module, each keeping the order of its modules. */
export function groupModules<M extends Pick<HomeModule, 'group'>>(modules: readonly M[]) {
  const groups = new Map<ModuleGroup, M[]>();
  modules.forEach((module) => groups.set(module.group, [...(groups.get(module.group) ?? []), module]));
  return Array.from(groups, ([group, items]) => ({ group, modules: items }));
}
