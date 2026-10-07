import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';

import { groupModules } from '../moduleFilter';
import { groupOrder, type HomeModule } from '../modules';
import { useModuleLabel } from '../useModules';
import { chunk, type LayoutProps, RowPadding, TileMarker, useGroupTone, useTileA11yLabel } from './shared';

const COLUMNS = 4;

/** "Theo nhóm" (2f): uppercase group titles, 4 columns, rounded squares tinted per group. */
export function GroupedLayout({ modules, signals, onOpen }: LayoutProps) {
  const { t } = useTranslation();

  return (
    <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 16, rowGap: 18 }}>
      {groupModules(modules, groupOrder).map(({ group, modules: items }) => (
        <View key={group} style={{ rowGap: 10 }}>
          <Text weight="semibold" accessibilityRole="header" className="px-1 text-meta text-muted" style={{ letterSpacing: 0.72, textTransform: 'uppercase' }}>
            {t(`home.groups.${group}`)}
          </Text>
          <View style={{ rowGap: 12 }}>
            {chunk(items, COLUMNS).map((row, index) => (
              <View key={index} className="flex-row" style={{ columnGap: 6 }}>
                {row.map((module) => (
                  <GroupedTile key={module.id} module={module} count={signals[module.id]?.badge?.data} onOpen={onOpen} />
                ))}
                <RowPadding count={COLUMNS - row.length} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function GroupedTile({ module, count, onOpen }: { module: HomeModule; count?: number; onOpen: LayoutProps['onOpen'] }) {
  const tone = useGroupTone(module.group);
  const label = useModuleLabel();
  const a11y = useTileA11yLabel();
  return (
    <Pressable
      testID={`home-module-${module.id}`}
      accessibilityRole="button"
      accessibilityLabel={a11y(module, label(module), count)}
      onPress={() => onOpen(module)}
      className="min-h-[44px] flex-1 items-center active:opacity-70"
      style={{ rowGap: 7 }}
    >
      <View className="h-[52px] w-[52px] items-center justify-center rounded-[16px]" style={{ backgroundColor: tone.box }}>
        <Icon icon={module.icon} size={24} rawColor={tone.icon} />
        <TileMarker module={module} count={count} className="-right-1 -top-1" />
      </View>
      <Text weight="medium" numberOfLines={2} className="text-center text-meta text-ink">
        {label(module, true)}
      </Text>
    </Pressable>
  );
}
