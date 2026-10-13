
function trimSlash(url: string) {
  return url.replace(/\/+$/, '');
}

/**
 * Runtime configuration. EXPO_PUBLIC_* values are inlined at build time, so they must be read with
 * literal `process.env.EXPO_PUBLIC_…` member expressions.
 */
export const env = {
  /** Origin of thaco_be_ql_buu_pham (no trailing /api). */
  parcelApiUrl: trimSlash(process.env.EXPO_PUBLIC_PARCEL_API_URL ?? 'https://quanlybuuphamapi.thaco.com.vn/'),
  /** Origin of thaco_be_ql_phong_hop (no trailing /api). */
  roomApiUrl: trimSlash(process.env.EXPO_PUBLIC_ROOM_API_URL ?? 'https://datphonghopapi.thaco.com.vn/'),
  /** Deep link that opens THACO Paytime; falls back to the store URL when it cannot be opened. */
  itSupportPhone: process.env.EXPO_PUBLIC_IT_SUPPORT_PHONE ?? '',
  /** THACO apps portal: which applications (parcel, room, văn thư…) the signed-in account may use. */
  appsApiUrl: trimSlash(process.env.EXPO_PUBLIC_APPS_API_URL || 'https://appsapi.thaco.com.vn'),
  sso: {
    issuer: trimSlash(process.env.EXPO_PUBLIC_SSO_ISSUER || 'https://sso.thaco.com.vn/realms/thacogroup'),
    clientId: process.env.EXPO_PUBLIC_SSO_CLIENT_ID ?? 'THACO_SSO',
    scope: process.env.EXPO_PUBLIC_SSO_SCOPES || 'openid profile email offline_access',
  },
  appVersion: process.env.EXPO_PUBLIC_APP_VERSION ?? '0.0.0',
  requestTimeoutMs: 20_000,
};

/** Login domains offered by the web apps (empty = log in with MSNV). */
export const loginDomains = ['thaco.com.vn', 'thagrico.vn', 'thiso.vn', 'emart.vn', 'thilogi.com.vn', 'thadico.vn', ''] as const;
