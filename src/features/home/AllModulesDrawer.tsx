import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { kvKeys, readJSON, writeJSON } from '@/core/storage/kv';
import { MAX_FONT_SCALE } from '@/core/theme/fonts';
import { useFontStyle } from '@/core/theme/fontStore';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';
import { CountBadge } from '@/shared/ui/CountBadge';
import { Icon } from '@/shared/ui/Icon';
import { ArrowUpRightIcon, CaretDownIcon, CaretRightIcon, MagnifyingGlassIcon, XIcon } from '@/shared/ui/icons';
import { SideDrawer } from '@/shared/ui/SideDrawer';
import { Text } from '@/shared/ui/Text';

import { useGroupTone } from './layouts/shared';
import { groupModules } from './moduleFilter';
import { groupOrder, type HomeModule, type ModuleGroup } from './modules';
import { type ModuleSignals, useModuleLabel } from './useModules';

type Props = {
  visible: boolean;
  onClose: () => void;
  modules: HomeModule[];
  signals: ModuleSignals;
  onOpen: (module: HomeModule) => void;
};

/**
 * Toolbar menu: a left drawer listing every utility as one expandable list per module group, with
 * search pinned on top. Collapsed groups are remembered on the device; a search expands them all.
 */
export function AllModulesDrawer({ visible, onClose, modules, signals, onOpen }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const label = useModuleLabel();
  const inputFont = useFontStyle('regular');
  const [query, setQuery] = useState('');

  const keyword = query.trim().toLowerCase();
  const results = keyword ? modules.filter((m) => label(m).toLowerCase().includes(keyword)) : modules;
  const groups = groupModules(results, groupOrder);
  const [collapsed, setCollapsed] = useState<ModuleGroup[]>(() => readJSON<ModuleGroup[]>(kvKeys.drawerCollapsedGroups) ?? []);

  const toggle = (group: ModuleGroup) => {
    const next = collapsed.includes(group) ? collapsed.filter((g) => g !== group) : [...collapsed, group];
    setCollapsed(next);
    writeJSON(kvKeys.drawerCollapsedGroups, next);
  };

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <SideDrawer
      testID="home-all-modules"
      visible={visible}
      onClose={close}
      title={t('home.allModules')}
      header={
        <View className="h-12 flex-row items-center gap-2.5 rounded-field border border-input-border bg-field px-3.5">
          <Icon icon={MagnifyingGlassIcon} size={18} color="subtle" />
          <TextInput
            testID="home-search"
            value={query}
            onChangeText={setQuery}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={colors.subtle}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            returnKeyType="search"
            style={{ flex: 1, fontSize: 14, color: colors.ink, ...inputFont }}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.clear')} onPress={() => setQuery('')} hitSlop={12}>
              <Icon icon={XIcon} size={16} color="subtle" />
            </Pressable>
          ) : null}
        </View>
      }
    >
      {groups.length ? (
        groups.map(({ group, modules: items }) => (
          <ModuleGroupSection
            key={group}
            group={group}
            expanded={!!keyword || !collapsed.includes(group)}
            onToggle={keyword ? undefined : () => toggle(group)}
            count={items.reduce((sum, m) => sum + (signals[m.id]?.badge?.data ?? 0), 0)}
          >
            {items.map((module, index) => (
              <ModuleRow
                key={module.id}
                module={module}
                label={label(module)}
                count={signals[module.id]?.badge?.data}
                divider={index > 0}
                onPress={() => {
                  close();
                  onOpen(module);
                }}
              />
            ))}
          </ModuleGroupSection>
        ))
      ) : (
        <Text className="py-6 text-center text-body text-muted">{t('home.noResult')}</Text>
      )}
    </SideDrawer>
  );
}

/** Group title that folds its list away; while collapsed it shows the group's total count so pending work stays visible. */
function ModuleGroupSection({
  group,
  expanded,
  onToggle,
  count,
  children,
}: {
  group: ModuleGroup;
  expanded: boolean;
  /** Undefined while searching: every group stays open. */
  onToggle?: () => void;
  count: number;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const title = t(`home.groups.${group}`);
  const caretStyle = useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(expanded ? '0deg' : '-90deg', { duration: 180 }) }] }));

  return (
    <Animated.View testID={`home-all-group-${group}`} layout={LinearTransition.duration(200)} style={{ rowGap: 8 }}>
      <Pressable
        testID={`home-all-group-${group}-toggle`}
        accessibilityRole="button"
        accessibilityState={{ expanded, disabled: !onToggle }}
        accessibilityLabel={!expanded && count ? `${title}, ${count}` : title}
        disabled={!onToggle}
        onPress={onToggle}
        className="min-h-[36px] flex-row items-center gap-2 px-1 active:opacity-70"
      >
        <Text weight="semibold" className="flex-1 text-meta text-muted" style={{ letterSpacing: 0.72, textTransform: 'uppercase' }}>
          {title}
        </Text>
        {!expanded ? <CountBadge count={count} /> : null}
        {onToggle ? (
          <Animated.View style={caretStyle}>
            <Icon icon={CaretDownIcon} size={14} weight="bold" color="subtle" />
          </Animated.View>
        ) : null}
      </Pressable>
      {expanded ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} className="overflow-hidden rounded-[16px] border border-line">
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function ModuleRow({ module, label, count, divider, onPress }: { module: HomeModule; label: string; count?: number; divider: boolean; onPress: () => void }) {
  const tone = useGroupTone(module.group);
  return (
    <Pressable
      testID={`home-all-${module.id}`}
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}, ${count}` : label}
      onPress={onPress}
      className={cn('min-h-[56px] flex-row items-center gap-3 px-3.5 active:opacity-70', divider && 'border-t border-line-2')}
    >
      <View className="h-9 w-9 items-center justify-center rounded-[11px]" style={{ backgroundColor: tone.box }}>
        <Icon icon={module.icon} size={18} rawColor={tone.icon} />
      </View>
      <Text className="flex-1 text-body">{label}</Text>
      <CountBadge count={count ?? 0} />
      <Icon icon={module.externalUrl ? ArrowUpRightIcon : CaretRightIcon} size={16} color="subtle" />
    </Pressable>
  );
}
