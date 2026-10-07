import Constants from 'expo-constants';

function trimSlash(url: string) {
  return url.replace(/\/+$/, '');
}

/**
 * Runtime configuration. EXPO_PUBLIC_* values are inlined at build time, so they must be read with
 * literal `process.env.EXPO_PUBLIC_…` member expressions.
 */
export const env = {
  /** Origin of thaco_be_ql_buu_pham (no trailing /api). */
  parcelApiUrl: trimSlash(process.env.EXPO_PUBLIC_PARCEL_API_URL ?? 'http://localhost:4001'),
  /** Origin of thaco_be_ql_phong_hop (no trailing /api). */
  roomApiUrl: trimSlash(process.env.EXPO_PUBLIC_ROOM_API_URL ?? 'http://localhost:4002'),
  /** Deep link that opens THACO Paytime; falls back to the store URL when it cannot be opened. */
  paytimeUrl: process.env.EXPO_PUBLIC_PAYTIME_URL ?? 'thacopaytime://',
  paytimeIosStoreUrl: process.env.EXPO_PUBLIC_PAYTIME_IOS_STORE_URL ?? 'https://apps.apple.com/vn/search?term=THACO%20Paytime',
  paytimeAndroidStoreUrl:
    process.env.EXPO_PUBLIC_PAYTIME_ANDROID_STORE_URL ?? 'https://play.google.com/store/search?q=THACO%20Paytime&c=apps',
  itSupportPhone: process.env.EXPO_PUBLIC_IT_SUPPORT_PHONE ?? '',
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  requestTimeoutMs: 20_000,
};

/** Login domains offered by the web apps (empty = log in with MSNV). */
export const loginDomains = ['thaco.com.vn', 'thagrico.vn', 'thiso.vn', 'emart.vn', 'thilogi.com.vn', 'thadico.vn', ''] as const;
