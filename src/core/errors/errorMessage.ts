import type { TFunction } from 'i18next';

import { ApiError } from '@/core/api/ApiError';
import vi from '@/core/i18n/locales/vi';

type ErrorKey = keyof typeof vi.errors;

function isKnownCode(code: string): code is ErrorKey {
  return Object.prototype.hasOwnProperty.call(vi.errors, code);
}

/** Error code the UI keys on: the server `errorCode` first, then a transport-level fallback. */
export function errorCodeOf(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.errorCode && isKnownCode(error.errorCode)) return error.errorCode;
    if (error.errorCode === 'TIMEOUT') return 'TIMEOUT';
    if (error.status === 0) return 'NETWORK';
    if (error.status === 401) return 'UNAUTHORIZED';
    if (error.status === 403) return 'FORBIDDEN';
    if (error.status === 404) return 'NOT_FOUND';
    if (error.status >= 500) return 'SERVER';
    return error.errorCode || `HTTP_${error.status}`;
  }
  return 'APP_ERROR';
}

/** Maps any thrown value to a Vietnamese/English sentence via the `errors.*` table. */
export function errorMessage(error: unknown, t: TFunction): string {
  const code = errorCodeOf(error);
  if (isKnownCode(code)) return t(`errors.${code}`);
  return t('errors.UNKNOWN', { code });
}
