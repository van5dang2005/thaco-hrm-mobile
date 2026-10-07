import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatDateTime, formatTime, isSameVnDay, parseServerDate } from '@/core/time/vn';
import { AvatarStack } from '@/shared/ui/Avatar';
import { Icon } from '@/shared/ui/Icon';
import { BellIcon, CheckIcon, XIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import type { StepView } from '../logic';

export { levelProgress } from '../logic';

const DOT = 32;

function Dot({ state }: { state: StepView['state'] }) {
  const { colors } = useTheme();
  const base = { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' } as const;
  if (state === 'approved') {
    return (
      <View style={[base, { backgroundColor: colors.success }]}>
        <Icon icon={CheckIcon} size={15} weight="bold" rawColor="#FFFFFF" />
      </View>
    );
  }
  if (state === 'rejected') {
    return (
      <View style={[base, { backgroundColor: colors.danger }]}>
        <Icon icon={XIcon} size={15} weight="bold" rawColor="#FFFFFF" />
      </View>
    );
  }
  if (state === 'pending') {
    return (
      <View style={[base, { backgroundColor: colors['primary-tint'], borderWidth: 2, borderColor: colors.primary }]}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
      </View>
    );
  }
  if (state === 'notify') {
    return (
      <View style={[base, { backgroundColor: colors['off-tint'] }]}>
        <Icon icon={BellIcon} size={15} color="subtle" />
      </View>
    );
  }
  return <View style={[base, { borderWidth: 2, borderColor: colors.line, backgroundColor: colors.elevated }]} />;
}

/** "Quy trình duyệt" stepper (design 6b): 32pt dots joined by a 2pt rule, green once approved. */
export function ApprovalStepper({ steps }: { steps: StepView[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const caption = step.state === 'notify' ? t('meeting.notifyStep') : step.name ? t('meeting.levelNamed', { order: step.order, name: step.name }) : t('meeting.level', { order: step.order });
        const names = step.handlers.map((h) => h.fullname).filter(Boolean).join(', ');
        const processed = parseServerDate(step.processedAt);
        return (
          <View key={step.key} className="flex-row gap-3" testID={`approval-step-${index}`}>
            <View className="items-center" style={{ width: DOT }}>
              <Dot state={step.state} />
              {!last ? <View style={{ flex: 1, width: 2, minHeight: 14, backgroundColor: step.state === 'approved' ? colors.success : colors.line }} /> : null}
            </View>
            <View className="min-w-0 flex-1 gap-[3px]" style={{ paddingTop: 5, paddingBottom: last ? 0 : 14 }}>
              <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11, lineHeight: 14 }}>
                {caption}
              </Text>
              {step.state === 'approved' || step.state === 'rejected' ? (
                <>
                  <Text weight="semibold" numberOfLines={2} style={{ fontSize: 14, lineHeight: 19, color: step.state === 'rejected' ? colors['danger-text'] : colors.ink }}>
                    {step.state === 'approved' ? t('meeting.approvedBy', { name: step.decidedBy?.fullname ?? names }) : t('meeting.rejectedBy', { name: step.decidedBy?.fullname ?? names })}
                  </Text>
                  {processed || step.comment ? (
                    <Text numberOfLines={3} className="text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
                      {processed ? (
                        <Text mono className="text-muted" style={{ fontSize: 12 }}>
                          {isSameVnDay(processed, new Date()) ? formatTime(processed) : formatDateTime(processed)}
                        </Text>
                      ) : null}
                      {step.comment ? `${processed ? ' · ' : ''}“${step.comment}”` : ''}
                    </Text>
                  ) : null}
                </>
              ) : step.state === 'pending' ? (
                <>
                  <Text weight="semibold" className="text-primary" style={{ fontSize: 14, lineHeight: 19 }}>
                    {t('meeting.waiting')}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <AvatarStack size={24} people={step.handlers.map((h) => ({ name: h.fullname, uri: h.avatarUrl }))} />
                    <Text className="flex-1 text-muted" numberOfLines={2} style={{ fontSize: 12, lineHeight: 17 }}>
                      {step.handlers.length > 1 ? t('meeting.anyOf', { count: step.handlers.length }) : names}
                    </Text>
                  </View>
                </>
              ) : step.state === 'notify' ? (
                <>
                  <Text weight="semibold" numberOfLines={2} className="text-muted" style={{ fontSize: 14, lineHeight: 19 }}>
                    {names || step.name || t('meeting.notifyStep')}
                  </Text>
                  <Text className="text-subtle" style={{ fontSize: 12, lineHeight: 17 }}>
                    {t('meeting.notifyStepHint')}
                  </Text>
                </>
              ) : (
                <>
                  <Text weight="semibold" className="text-muted" style={{ fontSize: 14, lineHeight: 19 }}>
                    {t('meeting.notReached')}
                  </Text>
                  {names ? (
                    <Text numberOfLines={2} className="text-subtle" style={{ fontSize: 12, lineHeight: 17 }}>
                      {names}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
