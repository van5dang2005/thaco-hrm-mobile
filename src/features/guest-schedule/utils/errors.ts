import type { TFunction } from 'i18next';

import { errorMessage } from '@/core/errors/errorMessage';

import { GuestError } from '../types';

/** A guest API error in words: its own codes first, then the app-wide table. */
export function guestErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof GuestError) return t(`guestSchedule.errors.${error.code}`);
  return errorMessage(error, t);
}
