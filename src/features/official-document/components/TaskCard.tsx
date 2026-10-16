import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatKey, todayKey } from '@/core/time/vn';
import { PressableCard } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import type { DocTask } from '../types';
import { taskProgress, taskStage, taskTone } from '../utils/tasks';
import { DeadlineTag } from './DeadlineTag';
import { RoleBadge } from './RoleBadge';
import { useTaskToneColors } from '../hooks/useTaskToneColors';

/** A task of "Việc của tôi": role, deadline, "Xử lý VB số …", chủ trì · distributor, and a bar from assignment to deadline. */
export function TaskCard({ task, onPress, today = todayKey(), compact }: { task: DocTask; onPress: () => void; today?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const stage = taskStage(task, today);
  const tone = useTaskToneColors()[taskTone(task)];
  const people = [task.chuTri && t('documents.tasks.chuTri', { name: task.chuTri }), task.nguoiPhanPhoi && t('documents.tasks.distributor', { name: task.nguoiPhanPhoi })].filter(Boolean).join(' · ');

  return (
    <PressableCard testID={`task-${task.soDen}`} onPress={onPress} className="flex-row">
      <View style={{ width: 4, backgroundColor: task.cancelled ? colors.subtle : tone }} />
      <View className="flex-1 gap-1.5 p-3.5">
        <View className="flex-row flex-wrap items-center gap-2">
          <RoleBadge role={task.role} task />
          {stage === 'da_huy' ? (
            <StatusBadge kind="off" label={t('documents.tasks.cancelled')} />
          ) : stage === 'hoan_thanh' ? (
            <StatusBadge kind="ok" label={t('documents.tasks.done')} />
          ) : (
            <DeadlineTag han={task.hasDeadline ? task.to : undefined} today={today} />
          )}
        </View>
        <Text weight="semibold" numberOfLines={compact ? 1 : 2} className={task.cancelled ? 'text-subtle line-through' : undefined} style={{ fontSize: 14, lineHeight: 20 }}>
          {t('documents.taskTitle', { soDen: task.soDen, trichYeu: task.trichYeu })}
        </Text>
        {!compact && people ? (
          <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
            {people}
          </Text>
        ) : null}
        {!compact && task.hasDeadline && !task.cancelled ? (
          <View className="mt-1 gap-1">
            <ProgressBar value={task.done ? 1 : taskProgress(task, today)} color={stage === 'qua_han' ? colors.danger : tone} height={5} />
            <View className="flex-row justify-between">
              <Text mono className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
                {formatKey(task.from, false)}
              </Text>
              <Text mono className={stage === 'qua_han' ? 'text-danger' : 'text-muted'} style={{ fontSize: 11.5, lineHeight: 15 }}>
                {formatKey(task.to, false)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </PressableCard>
  );
}
