import { useTranslation } from 'react-i18next';

import { errorMessage } from './errorMessage';

export function useErrorMessage(error: unknown): string {
  const { t } = useTranslation();
  return error ? errorMessage(error, t) : '';
}
