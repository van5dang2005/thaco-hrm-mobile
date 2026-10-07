import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';

import { useModuleLabel } from '../useModules';
import { chunk, type LayoutProps, RowPadding, TileMarker, useTileA11yLabel } from './shared';

const COLUMNS = 3;

/** "Lưới" (2c, default): 3 columns, round 58px icon rings, one brand color. */
export function GridLayout({ modules, signals, onOpen }: LayoutProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const label = useModuleLabel();
  const a11y = useTileA11yLabel();

  return (
    <View style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 16, rowGap: 22 }}>
      {chunk(modules, COLUMNS).map((row, index) => (
        <View key={index} className="flex-row" style={{ columnGap: 8 }}>
          {row.map((module) => {
            const count = signals[module.id]?.badge?.data;
            return (
              <Pressable
                key={module.id}
                testID={`home-module-${module.id}`}
                accessibilityRole="button"
                accessibilityLabel={a11y(module, label(module), count)}
                onPress={() => onOpen(module)}
                className="min-h-[44px] flex-1 items-center gap-2 active:opacity-70"
              >
                <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-icon-ring">
                  <Icon icon={module.icon} size={24} rawColor={colors['primary-tint-text']} />
                  <TileMarker module={module} count={count} className="-right-0.5 -top-0.5" />
                </View>
                <View className="items-center">
                  <Text weight="medium" numberOfLines={2} className="text-center text-sub-sm text-ink">
                    {label(module)}
                  </Text>
                  {module.noteKey ? (
                    <Text numberOfLines={1} className="text-center text-meta-sm text-subtle">
                      {t(`home.modules.${module.noteKey}`)}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
          <RowPadding count={COLUMNS - row.length} />
        </View>
      ))}
    </View>
  );
}
