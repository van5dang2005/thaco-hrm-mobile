import type { ServiceId } from '@/core/api/ApiError';
import { fetchWithTimeout } from '@/core/api/fetchWithTimeout';
import { buildUrl } from '@/core/api/http';
import { env } from '@/core/config/env';

import type { SsoAccount } from './sso';

/** An application the THACO apps portal grants the user (`GET /api/Application/my-apps`). */
export type MyApp = {
  id: string;
  /** Stable key: `PARCEL_MANAGEMENT_WEB`, `BOOKING_ROOM_WEB`, `VANTHU`, `ESIGN_WEB`… */
  code: string;
  name: string;
  description?: string | null;
  /** Absolute image URL (png / jpg / svg). */
  icon?: string | null;
  /** The web app. */
  url?: string | null;
  backendUrl?: string | null;
  displayOrder?: number | null;
  isActive?: boolean | null;
  isPublished?: boolean | null;
  categoryName?: string | null;
  category?: { id: string; code: string; name: string; displayOrder?: number | null } | null;
};

type MyAppsReply = { data?: MyApp[] | null; success?: boolean; message?: string | null };

/** Portal codes of the back-ends this app has screens for. */
export const serviceAppCodes: Record<ServiceId, string> = { parcel: 'PARCEL_MANAGEMENT_WEB', room: 'BOOKING_ROOM_WEB' };

/** Back-ends the portal grants. A service the user lacks would answer 401, which signs the whole session out. */
export function grantedServices(apps: readonly Pick<MyApp, 'code'>[]): Record<ServiceId, boolean> {
  const codes = new Set(apps.map((app) => app.code));
  return { parcel: codes.has(serviceAppCodes.parcel), room: codes.has(serviceAppCodes.room) };
}

/** Active apps of the SSO account; the portal keys them on the Keycloak id, username (MSNV) and email. */
export async function fetchMyApps(account: SsoAccount): Promise<MyApp[]> {
  const url = buildUrl(env.appsApiUrl, '/api/Application/my-apps', {
    id: account.id ?? '',
    username: account.username ?? '',
    email: account.email ?? '',
    isActive: true,
  });
  const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, env.requestTimeoutMs);
  const reply = (await response.json().catch(() => null)) as MyAppsReply | null;
  if (!response.ok || !reply || reply.success === false || !Array.isArray(reply.data)) {
    throw new Error(`MY_APPS_${response.status}${reply?.message ? `: ${reply.message}` : ''}`);
  }
  return reply.data.filter((app) => typeof app?.code === 'string');
}
