import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatDayMonth, formatTime, parseServerDate } from '@/core/time/vn';
import { Icon } from '@/shared/ui/Icon';
import { EnvelopeSimpleIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import { EmailStatus, ParcelStatus, type ParcelLog } from '../types';

/** "Lịch sử" from logs[] (6e): newest first, 10pt dots on a 2pt rule, server-provided Vietnamese descriptions. */
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
        const emailColor = log.emailStatus === EmailStatus.Successful ? colors.success : colors.danger;
        return (
          <View key={log.id} className="flex-row gap-3">
            <View className="items-center" style={{ width: 10 }}>
              <View style={{ marginTop: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: index === 0 ? (latestDot[status] ?? colors.primary) : colors['line-strong'] }} />
              {!last ? <View style={{ flex: 1, width: 2, backgroundColor: colors.line }} /> : null}
            </View>
            <View className="min-w-0 flex-1 gap-[3px]" style={{ paddingBottom: last ? 0 : 14 }}>
              <Text style={{ fontSize: 13, lineHeight: 18 }}>{log.description || log.action}</Text>
              <View className="flex-row flex-wrap items-center gap-x-1.5">
                <Text className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
                  {[who, at ? `${formatTime(at)} ${formatDayMonth(at)}` : null].filter(Boolean).join(' · ')}
                </Text>
                {emailed ? (
                  <View className="flex-row items-center gap-[3px]" accessibilityLabel={log.emailStatus === EmailStatus.Successful ? t('parcels.emailSent') : t('parcels.emailFailed')}>
                    <Icon icon={EnvelopeSimpleIcon} size={12} rawColor={emailColor} />
                    <Text style={{ fontSize: 11.5, lineHeight: 15, color: emailColor }}>{log.emailStatus === EmailStatus.Successful ? t('parcels.email') : t('parcels.emailFailed')}</Text>
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
