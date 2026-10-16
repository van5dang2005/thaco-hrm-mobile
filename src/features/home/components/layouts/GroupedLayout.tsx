import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';

import type { ModuleGroup } from '../../modules';
import { groupModules } from '../../utils/moduleFilter';
import { CardGlow, type LayoutProps, ModuleGrid, useGroupTone, useHomeCardEdge } from './shared';

/** "Theo nhóm" (2f): one white card per group (Phòng họp, Bưu phẩm, Ứng dụng khác), a 4×14 colored mark before the title, 4 columns. */
export function GroupedLayout({ modules, signals, onOpen }: LayoutProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-3">
      {groupModules(modules).map(({ group, modules: items }) => {
        const todo = items.reduce((sum, m) => sum + (signals[m.id]?.badge?.data ?? 0), 0);
        return <GroupCard key={group} group={group} label={t(`home.groups.${group}`)} note={todo ? t('home.groupTodo', { count: todo }) : undefined} modules={items} signals={signals} onOpen={onOpen} />;
      })}
    </View>
  );
}

type GroupCardProps = Pick<LayoutProps, 'modules' | 'signals' | 'onOpen'> & { group: ModuleGroup; label: string; note?: string };

/** One group's card; in dark mode its edge is lit and its color washes in from the corner. */
function GroupCard({ group, label, note, modules, signals, onOpen }: GroupCardProps) {
  const tone = useGroupTone(group);
  const edge = useHomeCardEdge();
  return (
    <Card testID={`home-group-${group}`} className="gap-3.5 overflow-visible px-2 pb-4 pt-3.5" style={edge}>
      <CardGlow color={tone.bar} />
      <GroupTitle group={group} label={label} note={note} />
      <ModuleGrid modules={modules} signals={signals} onOpen={onOpen} />
    </Card>
  );
}

function GroupTitle({ group, label, note }: { group: ModuleGroup; label: string; note?: string }) {
  const tone = useGroupTone(group);
  return (
    <View className="flex-row items-center gap-2 px-2">
      <View className="h-3.5 w-1 rounded-full" style={{ backgroundColor: tone.bar }} />
      <Text weight="bold" accessibilityRole="header" numberOfLines={1} className="flex-1 text-ink" style={{ fontSize: 14.5, lineHeight: 19 }}>
        {label}
      </Text>
      {note ? (
        <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}
