import { useQuery } from '@tanstack/react-query';

import { parcelApi } from '@/core/api/clients';
import type { MenuDto, Paginated } from '@/core/api/types';
import { qk } from '@/core/query/keys';

import { isAdministrator, useSessionStore } from './sessionStore';
import { useParcelMe } from './useMe';

/** Features gated by server-side permissions. */
export type Capability = 'parcel.reception';

/**
 * The parcel service filters GET /api/menus by the caller's Menu permissions (the web app gates its
 * screens the same way). The reception list lives at "/buu-kien". `my-permissions` is not usable:
 * its controller is restricted to Administrator.
 */
const RECEPTION_MENU_URL = '/buu-kien';

const normalize = (url?: string | null) => (url ?? '').trim().toLowerCase().replace(/\/+$/, '');

export function useParcelMenus() {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({
    queryKey: qk.menus,
    queryFn: () => parcelApi.get<Paginated<MenuDto>>('/api/menus', { query: { pageNumber: 1, pageSize: 500 } }),
    enabled: connected,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCapabilities() {
  const menus = useParcelMenus();
  // Roles come from the service's own profile: the SSO token carries none of this app's roles.
  const parcelMe = useParcelMe();
  const parcelRoles = parcelMe.data?.roles ?? [];
  const parcelConnected = useSessionStore((s) => s.connected.parcel);

  const menuUrls = new Set((menus.data?.items ?? []).filter((m) => m.isActive !== false).map((m) => normalize(m.url)));
  const reception = parcelConnected && (isAdministrator(parcelRoles) || menuUrls.has(RECEPTION_MENU_URL));

  const has = (capability: Capability) => {
    switch (capability) {
      case 'parcel.reception':
        return reception;
    }
  };

  return { has, isLoading: menus.isLoading || parcelMe.isLoading };
}
