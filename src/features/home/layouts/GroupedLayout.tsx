import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';

import { groupModules } from '../moduleFilter';
import { groupOrder, type ModuleGroup } from '../modules';
import { type LayoutProps, ModuleGrid, useGroupTone } from './shared';

/** "Theo nhóm" (2f): one white card per group (Phòng họp, Bưu phẩm, Nhân sự), a 4×14 colored mark before the title, 4 columns. */
export function GroupedLayout({ modules, signals, onOpen }: LayoutProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-3">
      {groupModules(modules, groupOrder).map(({ group, modules: items }) => {
        const todo = items.reduce((sum, m) => sum + (signals[m.id]?.badge?.data ?? 0), 0);
        return (
          <Card key={group} testID={`home-group-${group}`} className="gap-3.5 overflow-visible px-2 pb-4 pt-3.5">
            <GroupTitle group={group} label={t(`home.groups.${group}`)} note={todo ? t('home.groupTodo', { count: todo }) : undefined} />
            <ModuleGrid modules={items} signals={signals} onOpen={onOpen} />
          </Card>
        );
      })}
    </View>
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
