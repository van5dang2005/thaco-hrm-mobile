import type vi from '@/core/i18n/locales/vi';

/** An `errors.*` key: SSO failures are worded like server errors. */
export type SsoErrorCode = keyof typeof vi.errors;

/** THACO SSO sign-in failure: Keycloak refused or was unreachable, or no back-end accepts the account. */
export class SsoError extends Error {
  readonly code: SsoErrorCode;
  /** HTTP status of Keycloak's answer; undefined when Keycloak was not reached. */
  readonly status?: number;

  constructor(code: SsoErrorCode, message?: string, status?: number) {
    super(message ?? code);
    this.name = 'SsoError';
    this.code = code;
    this.status = status;
  }
}
