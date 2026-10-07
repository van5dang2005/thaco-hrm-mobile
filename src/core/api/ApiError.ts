export type ServiceId = 'parcel' | 'room';

type ApiErrorInit = {
  service: ServiceId;
  status: number;
  errorCode: string;
  message: string;
  details?: unknown;
};

/**
 * Normalised back-end failure. `status` is 0 for network failures. `errorCode` always comes from
 * the server body (`errorCode`) when present, otherwise a synthetic code (NETWORK, TIMEOUT, HTTP_404…).
 */
export class ApiError extends Error {
  readonly service: ServiceId;
  readonly status: number;
  readonly errorCode: string;
  readonly details?: unknown;

  constructor({ service, status, errorCode, message, details }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.service = service;
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }

  get isNetwork() {
    return this.status === 0;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
