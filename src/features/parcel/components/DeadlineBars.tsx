import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatKey } from '@/core/time/vn';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { onBlue, useHeaderColors } from '@/shared/ui/ScreenShell';
import { parcelBadgeKind } from '@/shared/ui/status';
import { Text } from '@/shared/ui/Text';
import { useToneColors, type Tone } from '@/shared/ui/tones';

import { ParcelStatus } from '../types';
import type { Deadline } from '../utils/parcel';

/** "Còn N ngày" / "Hạn hôm nay" / "Quá hạn N ngày" (header pill and list cards). */
export function daysLeftLabel(t: TFunction, deadline: Deadline) {
  return deadline.daysLeft > 0
    ? t('parcels.daysLeft', { count: deadline.daysLeft })
    : deadline.daysLeft === 0
      ? t('parcels.dueTodayShort')
      : t('parcels.overdueDays', { count: -deadline.daysLeft });
}

/**
 * Deadline row of list cards (6d), under a hairline: "Hạn nhận 06/10 ······ Còn 1 ngày" or
 * "Quá hạn 2 ngày ······ Tự hủy ~06/10", then a 5pt bar on a track tinted like the status.
 */
export function DeadlineBar({ status, deadline }: { status: ParcelStatus; deadline: Deadline }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tone = useToneColors(parcelBadgeKind(status) as Tone);
  const overdue = status === ParcelStatus.Overdue;
  const left = overdue ? t('parcels.overdueDays', { count: Math.max(1, -deadline.daysLeft) }) : t('parcels.dueOn', { date: formatKey(deadline.dueKey, false) });
  const right = overdue ? t('parcels.autoCancel', { date: formatKey(deadline.cancelKey, false) }) : daysLeftLabel(t, deadline);
  return (
    <View className="gap-1.5 border-t border-line-2 pt-2.5">
      <View className="flex-row items-center justify-between gap-2">
        <Text numberOfLines={1} className="flex-shrink text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
          {left}
        </Text>
        <Text weight="bold" numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 15, color: status === ParcelStatus.Waiting ? colors.ink : tone.text }}>
          {right}
        </Text>
      </View>
      <ProgressBar value={deadline.dueProgress} color={tone.solid} track={tone.tint} height={5} />
    </View>
  );
}

/** Lifecycle panel on the blue header of 6e: knob bar, then Tiếp nhận / Hạn / Tự hủy with their dates. */
export function LifecyclePanel({ status, deadline }: { status: ParcelStatus; deadline: Deadline }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fg, text2 } = useHeaderColors();
  const fill = status === ParcelStatus.Due ? colors['header-dot-warn'] : status === ParcelStatus.Overdue ? colors['header-dot-danger'] : colors['header-dot-wait'];
  const marks = [
    { label: t('parcels.markReceived'), date: formatKey(deadline.startKey, false) },
    { label: t('parcels.markDue'), date: formatKey(deadline.dueKey, false) },
    { label: t('parcels.markCancel'), date: `~${formatKey(deadline.cancelKey, false)}` },
  ];
  return (
    <View testID="parcel-lifecycle" className="mt-3 gap-2 rounded-[14px] p-3" style={{ backgroundColor: onBlue(0.1) }}>
      <View className="py-1">
        <ProgressBar value={deadline.progress} color={fill} onHeader knob />
      </View>
      <View className="flex-row justify-between gap-2">
        {marks.map((m) => (
          <Text key={m.label} numberOfLines={1} className="flex-shrink" maxFontSizeMultiplier={1.15} style={{ fontSize: 11, lineHeight: 14, color: text2 }}>
            {`${m.label} `}
            <Text mono weight="bold" style={{ fontSize: 11, color: fg }}>
              {m.date}
            </Text>
          </Text>
        ))}
      </View>
    </View>
  );
}
