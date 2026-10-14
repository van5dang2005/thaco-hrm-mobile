import { useTranslation } from 'react-i18next';

import { formatKey } from '@/core/time/vn';

import type { BlockReason } from '../utils/booking';

/** Text for a room that cannot take the request (`evaluateRoom`). */
export function useBlockReasonText() {
  const { t } = useTranslation();
  return (reason?: BlockReason) => {
    switch (reason?.code) {
      case 'crossLevel':
        return t('booking.reasonCrossLevel');
      case 'outsideHours':
        return t('booking.reasonOutsideHours', { open: reason.open, close: reason.close });
      case 'advance':
        return t('booking.reasonAdvance', { days: reason.days });
      case 'conflict':
        return t('booking.reasonConflict', { date: formatKey(reason.date, false) });
      case 'inactive':
        return t('booking.reasonInactive');
      default:
        return '';
    }
  };
}
