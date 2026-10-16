import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatKey, todayKey, type DateKey } from '@/core/time/vn';
import { Icon } from '@/shared/ui/Icon';
import { ClockAlertIcon, ClockIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import { deadlineOf } from '../utils/deadline';

/** "Còn N ngày" (muted) · "Hạn dd/MM" · "Hạn hôm nay" (warning) · "Quá hạn N ngày" (danger). Nothing without a deadline. */
export function DeadlineTag({ han, today = todayKey(), testID }: { han?: DateKey; today?: DateKey; testID?: string }) {
  const { t } = useTranslation();
  const deadline = deadlineOf(han, today);
  if (!deadline) return null;

  const { label, color, icon } =
    deadline.state === 'overdue'
      ? { label: t('documents.deadline.overdue', { count: deadline.days }), color: 'danger' as const, icon: ClockAlertIcon }
      : deadline.state === 'today'
        ? { label: t('documents.deadline.today'), color: 'warning-text' as const, icon: ClockAlertIcon }
        : deadline.state === 'left'
          ? { label: t('documents.deadline.left', { count: deadline.days }), color: 'muted' as const, icon: ClockIcon }
          : { label: t('documents.deadline.date', { date: formatKey(deadline.han, false) }), color: 'muted' as const, icon: ClockIcon };

  return (
    <View testID={testID} className="flex-row items-center gap-1">
      <Icon icon={icon} size={13} color={color} weight={color === 'muted' ? 'regular' : 'bold'} />
      <Text weight={color === 'muted' ? 'medium' : 'semibold'} numberOfLines={1} className={color === 'danger' ? 'text-danger' : color === 'warning-text' ? 'text-warning-text' : 'text-muted'} style={{ fontSize: 12, lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
}
