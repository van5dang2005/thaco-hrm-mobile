import { Pressable, View } from 'react-native';

import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui/Icon';
import { ArrowUpRightIcon } from '@/shared/ui/icons';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

import type { HomeModule } from '../modules';
import type { ModuleSignals } from '../useModules';
import { useModuleLabel } from '../useModules';
import { chunk, type LayoutProps, RowPadding, useGroupTone, useTileA11yLabel } from './shared';

const COLUMNS = 2;

/** "Thẻ" (2g): 2 columns of bordered cards with a live one-line summary. */
export function CardLayout({ modules, signals, onOpen }: LayoutProps) {
  return (
    <View style={{ paddingVertical: 10, paddingHorizontal: 16, rowGap: 8 }}>
      {chunk(modules, COLUMNS).map((row, index) => (
        <View key={index} className="flex-row" style={{ columnGap: 8 }}>
          {row.map((module) => (
            <ModuleCard key={module.id} module={module} signal={signals[module.id]} onOpen={onOpen} />
          ))}
          <RowPadding count={COLUMNS - row.length} />
        </View>
      ))}
    </View>
  );
}

function ModuleCard({ module, signal, onOpen }: { module: HomeModule; signal?: ModuleSignals[string]; onOpen: LayoutProps['onOpen'] }) {
  const tone = useGroupTone(module.group);
  const label = useModuleLabel();
  const a11y = useTileA11yLabel();
  const count = signal?.badge?.data;
  const summary = signal?.summary;
  const urgent = !!module.urgentWhenBadged && !!count;

  return (
    <Pressable
      testID={`home-module-${module.id}`}
      accessibilityRole="button"
      accessibilityLabel={a11y(module, label(module), undefined, summary?.data)}
      onPress={() => onOpen(module)}
      className={cn('min-h-[56px] flex-1 flex-row items-center gap-2.5 rounded-[16px] border bg-surface px-3 py-2 active:opacity-70', urgent ? 'border-danger-border' : 'border-line')}
    >
      <View className="h-9 w-9 items-center justify-center rounded-[11px]" style={{ backgroundColor: tone.box }}>
        <Icon icon={module.icon} size={19} rawColor={tone.icon} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text weight="semibold" numberOfLines={2} className="text-sub leading-[16px]">
          {label(module)}
        </Text>
        {summary?.data ? (
          <Text weight={urgent ? 'semibold' : 'regular'} numberOfLines={1} className={cn('text-meta-sm', urgent ? 'text-danger-text' : 'text-muted')}>
            {summary.data}
          </Text>
        ) : summary?.isLoading ? (
          <View className="py-0.5">
            <Skeleton width="70%" height={10} radius={4} />
          </View>
        ) : null}
      </View>
      {module.externalUrl ? <Icon icon={ArrowUpRightIcon} size={16} color="subtle" /> : null}
    </Pressable>
  );
}
