import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import type { ColorToken } from '@/core/theme/palette';
import { useTheme } from '@/core/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { type AppIcon, ArrowUpRightIcon, PackageIcon, SquareCheckBigIcon } from '@/shared/ui/icons';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

import { SectionHeader } from './layouts/shared';
import type { HomeModule } from './modules';
import { todoModuleIds, type TodoKind, useTodoItems } from './signals';

/** Per tile: tinted background, glyph color, deep text color (2c). */
export const todoTones: Record<TodoKind, { icon: AppIcon; tint: ColorToken; solid: ColorToken; deep: ColorToken }> = {
  approvals: { icon: SquareCheckBigIcon, tint: 'primary-tint', solid: 'primary', deep: 'primary-dark' },
  parcels: { icon: PackageIcon, tint: 'warning-tint', solid: 'warning', deep: 'warning-deep' },
};

const kinds: TodoKind[] = ['approvals', 'parcels'];

/** The to-do kinds whose module the user can see, with the module to open. */
export function useVisibleTodos(modules: HomeModule[]) {
  return kinds.flatMap((kind) => {
    const module = modules.find((m) => m.id === todoModuleIds[kind]);
    return module ? [{ kind, module }] : [];
  });
}

/** "Cần xử lý" (2c): equal tinted tiles — Chờ duyệt, Bưu phẩm. */
export function TodoTiles({ modules, onOpen }: { modules: HomeModule[]; onOpen: (module: HomeModule) => void }) {
  const { t } = useTranslation();
  const visible = useVisibleTodos(modules);
  if (!visible.length) return null;
  return (
    <View testID="home-todo" className="gap-2.5">
      <SectionHeader title={t('home.todo.title')} />
      <View className="flex-row gap-2">
        {visible.map(({ kind, module }) => (
          <TodoTile key={kind} kind={kind} onPress={() => onOpen(module)} />
        ))}
      </View>
    </View>
  );
}

function TodoTile({ kind, onPress }: { kind: TodoKind; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const item = useTodoItems()[kind];
  const tone = todoTones[kind];
  const deep = colors[tone.deep];
  const label = t(`home.todo.${kind}`);

  return (
    <Pressable
      testID={`home-todo-${kind}`}
      accessibilityRole="button"
      accessibilityLabel={[label, item.count ?? '', item.sub].filter((v) => v !== '').join(', ')}
      onPress={onPress}
      className="min-w-0 flex-1 gap-2.5 rounded-[18px] p-3 active:opacity-80"
      style={{ backgroundColor: colors[tone.tint] }}
    >
      <View className="flex-row items-start justify-between">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-elevated">
          <Icon icon={tone.icon} size={16} rawColor={colors[tone.solid]} />
        </View>
        <Icon icon={ArrowUpRightIcon} size={14} weight="bold" rawColor={deep} />
      </View>
      <View>
        {item.count === undefined && item.isLoading ? (
          <Skeleton width={28} height={26} radius={6} />
        ) : (
          <Text mono weight="bold" maxFontSizeMultiplier={1.15} style={{ fontSize: 26, lineHeight: 31, color: deep }}>
            {String(item.count ?? 0)}
          </Text>
        )}
        <Text weight="bold" numberOfLines={1} className="text-ink" style={{ fontSize: 12.5, lineHeight: 17 }}>
          {label}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, color: deep }}>
          {item.sub ?? ' '}
        </Text>
      </View>
    </Pressable>
  );
}
