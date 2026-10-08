import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatDayMonth, formatTime, parseServerDate } from '@/core/time/vn';
import { Icon } from '@/shared/ui/Icon';
import { MailIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import { EmailStatus, ParcelStatus, type ParcelLog } from '../types';

/**
 * "Lịch sử" from logs[] (6e): newest first, 12pt dots with a soft ring on a 2pt rule. The newest dot
 * takes the parcel's status color; descriptions are the server's Vietnamese sentences.
 */
export function ParcelTimeline({ logs, status }: { logs: ParcelLog[]; status: ParcelStatus }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const latestDot: Record<number, string> = {
    [ParcelStatus.Waiting]: colors.primary,
    [ParcelStatus.Due]: colors.warning,
    [ParcelStatus.Overdue]: colors.danger,
    [ParcelStatus.HandedOver]: colors.success,
    [ParcelStatus.Cancelled]: colors.subtle,
  };
  const sorted = [...logs].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return (
    <View>
      {sorted.map((log, index) => {
        const last = index === sorted.length - 1;
        const who = log.performedCode === 'SYSTEM' ? t('common.system') : log.performedName;
        const at = parseServerDate(log.createdAt);
        const emailed = log.emailStatus === EmailStatus.Successful || log.emailStatus === EmailStatus.Failed;
        const emailOk = log.emailStatus === EmailStatus.Successful;
        const emailColor = emailOk ? colors.success : colors.danger;
        const dot = index === 0 ? (latestDot[status] ?? colors.primary) : colors.primary;
        return (
          <View key={log.id} className="flex-row gap-3">
            <View className="items-center pt-1" style={{ width: 12 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dot, boxShadow: `0px 0px 0px 3px ${dot}22` }} />
              {!last ? <View className="mt-1" style={{ flex: 1, width: 2, backgroundColor: colors.line }} /> : null}
            </View>
            <View className="min-w-0 flex-1 gap-[3px]" style={{ paddingBottom: last ? 0 : 12 }}>
              <Text weight="semibold" style={{ fontSize: 13, lineHeight: 18 }}>
                {log.description || log.action}
              </Text>
              <View className="flex-row flex-wrap items-center gap-x-2">
                <Text className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
                  {at ? <Text mono className="text-muted" style={{ fontSize: 11.5 }}>{`${formatTime(at)} ${formatDayMonth(at)}`}</Text> : null}
                  {at && who ? ' · ' : ''}
                  {who}
                </Text>
                {emailed ? (
                  <View className="flex-row items-center gap-[3px]">
                    <Icon icon={MailIcon} size={12} rawColor={emailColor} />
                    <Text weight="semibold" style={{ fontSize: 11.5, lineHeight: 15, color: emailColor }}>
                      {emailOk ? t('parcels.emailSent') : t('parcels.emailFailed')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
