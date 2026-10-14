import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatDayMonth, formatTime, parseServerDate } from '@/core/time/vn';
import { Avatar, AvatarStack } from '@/shared/ui/Avatar';
import { Icon } from '@/shared/ui/Icon';
import { BellIcon, CheckIcon, ClockIcon, XIcon } from '@/shared/ui/icons';
import { Tag } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import type { StepView } from '../utils/booking';

export { levelProgress } from '../utils/booking';

const DOT = 28;

function Dot({ state }: { state: StepView['state'] }) {
  const { colors } = useTheme();
  const base = { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' } as const;
  if (state === 'approved') {
    return (
      <View style={[base, { backgroundColor: colors.success }]}>
        <Icon icon={CheckIcon} size={14} weight="bold" rawColor="#FFFFFF" />
      </View>
    );
  }
  if (state === 'rejected') {
    return (
      <View style={[base, { backgroundColor: colors.danger }]}>
        <Icon icon={XIcon} size={14} weight="bold" rawColor="#FFFFFF" />
      </View>
    );
  }
  if (state === 'pending') {
    return (
      <View style={[base, { backgroundColor: colors.elevated, borderWidth: 2, borderColor: colors.primary, boxShadow: `0px 0px 0px 4px ${colors['primary-tint']}` }]}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
      </View>
    );
  }
  if (state === 'notify') {
    return (
      <View style={[base, { backgroundColor: colors['off-tint'] }]}>
        <Icon icon={BellIcon} size={13} color="subtle" />
      </View>
    );
  }
  return <View style={[base, { borderWidth: 2, borderColor: colors['line-strong'], backgroundColor: colors.elevated }]} />;
}

/** "Đã chờ 2 giờ" span from an ISO time to now. */
function useWaited() {
  const { t } = useTranslation();
  return (since?: string | null, now = new Date()) => {
    const start = parseServerDate(since);
    if (!start) return null;
    const minutes = Math.max(1, Math.round((now.getTime() - start.getTime()) / 60_000));
    if (minutes < 60) return t('time.minutes', { count: minutes });
    if (minutes < 48 * 60) return t('time.hours', { count: Math.round(minutes / 60) });
    return t('time.days', { count: Math.round(minutes / (24 * 60)) });
  };
}

/**
 * "Lịch sử duyệt" (6b): a rail of 28pt dots (green ✓ approved, blue ring pending, bell notify) and,
 * per level, a box with the level name, a status chip, the approver and the comment.
 * `waitingSince` is when the pending level started (previous decision or the request).
 */
export function ApprovalStepper({ steps, waitingSince }: { steps: StepView[]; waitingSince?: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const waited = useWaited();
  return (
    <View>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const heading = step.state === 'notify' ? [t('meeting.notifyStep'), step.name].filter(Boolean).join(' · ') : step.name ? t('meeting.levelNamed', { order: step.order, name: step.name }) : t('meeting.level', { order: step.order });
        const names = step.handlers.map((h) => h.fullname).filter(Boolean).join(', ');
        const processed = parseServerDate(step.processedAt);
        const decided = step.state === 'approved' || step.state === 'rejected';
        const pending = step.state === 'pending';
        const notify = step.state === 'notify';
        const span = pending ? waited(waitingSince) : null;
        return (
          <View key={step.key} className="flex-row gap-3" testID={`approval-step-${index}`}>
            <View className="items-center" style={{ width: DOT, paddingTop: notify ? 6 : 10 }}>
              <Dot state={step.state} />
              {!last ? <View style={{ flex: 1, width: 2, minHeight: 10, marginVertical: 3, backgroundColor: step.state === 'approved' ? colors.success : colors.line }} /> : null}
            </View>
            <View
              className="min-w-0 flex-1 gap-2 rounded-[14px] px-3"
              style={{
                paddingVertical: notify ? 9 : 11,
                marginBottom: last ? 0 : 10,
                backgroundColor: pending ? colors['selected-tint'] : colors.panel,
                borderWidth: pending ? 1.5 : 0,
                borderColor: colors['wait-border'],
              }}
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text weight="bold" numberOfLines={1} className="flex-shrink text-muted" style={{ fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  {heading}
                </Text>
                {step.state === 'approved' ? (
                  <Tag kind="ok" icon={CheckIcon} label={t('meeting.approved')} />
                ) : step.state === 'rejected' ? (
                  <Tag kind="danger" icon={XIcon} label={t('status.booking.3')} />
                ) : pending ? (
                  <Tag kind="wait" icon={ClockIcon} label={t('meeting.pending')} />
                ) : notify ? (
                  <Tag label={t('meeting.afterApproval')} />
                ) : (
                  <Tag label={t('meeting.notReached')} />
                )}
              </View>

              {decided ? (
                <>
                  <View className="flex-row items-center gap-2.5">
                    <Avatar name={step.decidedBy?.fullname ?? names} uri={step.decidedBy?.avatarUrl} size={26} />
                    <View className="min-w-0 flex-1">
                      <Text weight="bold" numberOfLines={1} className="text-ink" style={{ fontSize: 14, lineHeight: 19 }}>
                        {step.decidedBy?.fullname ?? names}
                      </Text>
                      {processed ? (
                        <Text mono className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
                          {`${formatTime(processed)} · ${formatDayMonth(processed)}`}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {step.comment ? (
                    <View className="rounded-[10px] bg-elevated px-3 py-2">
                      <Text className="text-ink-2" style={{ fontSize: 13, lineHeight: 18 }}>
                        {`“${step.comment}”`}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : notify ? null : step.handlers.length ? (
                <View className="flex-row items-center gap-2.5">
                  <AvatarStack size={26} max={3} people={step.handlers.map((h) => ({ name: h.fullname, uri: h.avatarUrl }))} />
                  <View className="min-w-0 flex-1">
                    <Text weight="bold" numberOfLines={1} style={{ fontSize: 14, lineHeight: 19, color: pending ? colors.ink : colors.muted }}>
                      {names}
                    </Text>
                    {pending ? (
                      <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
                        {span ? (step.handlers.length > 1 ? t('meeting.waitingFor', { time: span }) : t('meeting.waitingForOne', { time: span })) : t('meeting.waiting')}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
