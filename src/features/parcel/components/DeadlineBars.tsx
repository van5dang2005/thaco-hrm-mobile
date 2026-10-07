import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatKey } from '@/core/time/vn';
import { HeaderPanel } from '@/shared/ui/HeaderPanel';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { useHeaderColors } from '@/shared/ui/ScreenShell';
import { Text } from '@/shared/ui/Text';

import type { Deadline } from '../logic';
import { ParcelStatus } from '../types';

/** "Hạn nhận dd/MM · còn N ngày" / "Quá hạn N ngày · tự hủy khoảng dd/MM". */
export function useDeadlineLabel() {
  const { t } = useTranslation();
  return (status: ParcelStatus, deadline: Deadline) =>
    status === ParcelStatus.Overdue
      ? t('parcels.overdueBy', { count: Math.max(0, -deadline.daysLeft), date: formatKey(deadline.cancelKey, false) })
      : deadline.daysLeft <= 0
        ? t('parcels.dueToday', { date: formatKey(deadline.dueKey, false) })
        : t('parcels.dueIn', { date: formatKey(deadline.dueKey, false), count: deadline.daysLeft });
}

/** 6pt "hạn nhận" bar of list cards (6d), colored by status. */
export function DeadlineBar({ status, deadline }: { status: ParcelStatus; deadline: Deadline }) {
  const { colors } = useTheme();
  const label = useDeadlineLabel()(status, deadline);
  const fill = status === ParcelStatus.Due ? colors.warning : status === ParcelStatus.Overdue ? colors.danger : colors.primary;
  const text = status === ParcelStatus.Due ? colors['warning-text'] : status === ParcelStatus.Overdue ? colors['danger-text'] : colors.muted;
  return (
    <View className="gap-1.5">
      <ProgressBar value={deadline.progress} color={fill} />
      <Text weight="semibold" numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 15, color: text }}>
        {label}
      </Text>
    </View>
  );
}

/** Lifecycle panel on the blue header of 6e: due date, days left, knob bar, Tiếp nhận / Quá hạn / Tự hủy marks. */
export function LifecyclePanel({ status, deadline }: { status: ParcelStatus; deadline: Deadline }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fg, sub } = useHeaderColors();
  const fill = status === ParcelStatus.Due ? colors['header-dot-warn'] : status === ParcelStatus.Overdue ? colors['header-dot-danger'] : colors['header-dot-wait'];
  const accent = status === ParcelStatus.Due ? colors['header-warn-text'] : status === ParcelStatus.Overdue ? colors['header-dot-danger'] : sub;
  const left =
    deadline.daysLeft > 0
      ? t('parcels.daysLeft', { count: deadline.daysLeft })
      : deadline.daysLeft === 0
        ? t('parcels.dueTodayShort')
        : t('parcels.overdueDays', { count: -deadline.daysLeft });
  return (
    <HeaderPanel testID="parcel-lifecycle" className="gap-2.5">
      <View className="flex-row items-baseline justify-between gap-2">
        <Text weight="semibold" numberOfLines={1} style={{ fontSize: 14, lineHeight: 19, color: fg }}>
          {t('parcels.dueOn', { date: formatKey(deadline.dueKey, false) })}
        </Text>
        <Text weight="bold" numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, color: accent }}>
          {left}
        </Text>
      </View>
      <ProgressBar value={deadline.progress} color={fill} height={8} onHeader knob />
      <View className="flex-row justify-between gap-2">
        {[
          t('parcels.receivedLabel', { date: formatKey(deadline.startKey, false) }),
          t('parcels.overdueOn', { date: formatKey(deadline.dueKey, false) }),
          t('parcels.autoCancel', { date: formatKey(deadline.cancelKey, false) }),
        ].map((label) => (
          <Text key={label} numberOfLines={1} className="flex-shrink" maxFontSizeMultiplier={1.15} style={{ fontSize: 11, lineHeight: 14, color: sub }}>
            {label}
          </Text>
        ))}
      </View>
    </HeaderPanel>
  );
}
