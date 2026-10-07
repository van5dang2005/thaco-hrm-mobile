import type { ServiceId } from '@/core/api/ApiError';
import type { Capability } from '@/core/session/capabilities';

import type { HomeModule, ModuleGroup } from './modules';

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

/** Non-empty groups in `order`, each keeping the config order of its modules. */
export function groupModules<M extends Pick<HomeModule, 'group'>>(modules: readonly M[], order: readonly ModuleGroup[]) {
  return order
    .map((group) => ({ group, modules: modules.filter((m) => m.group === group) }))
    .filter((entry) => entry.modules.length > 0);
}
