import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { type AppIcon, ArrowDownIcon, ArrowUpIcon, ListOrderedIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import { ModuleIcon, useGroupTone } from './layouts/shared';
import type { HomeModule } from './modules';
import { orderModules, useHomePrefs } from './prefs';
import { useAvailableModules, useModuleLabel } from './useModules';

type Props = { visible: boolean; onClose: () => void };

/** Move `ids[index]` by `delta` places (pure, for the arrows below). */
export function moveItem<T>(items: readonly T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** "Sắp xếp tiện ích": the visible services in order, each with ↑ / ↓. Saved with "Xong". */
export function ModuleOrderSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const available = useAvailableModules();
  const order = useHomePrefs((s) => s.order);
  const setOrder = useHomePrefs((s) => s.setOrder);
  const modules = orderModules(available, order);
  const [ids, setIds] = useState<string[]>([]);

  // Start from the current order every time the sheet opens.
  useEffect(() => {
    if (visible) setIds(modules.map((m) => m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [visible]);

  const byId = new Map(modules.map((m) => [m.id, m]));
  const items = ids.map((id) => byId.get(id)).filter((m): m is HomeModule => !!m);

  const done = () => {
    setOrder(ids);
    onClose();
  };

  return (
    <BottomSheet
      testID="home-order-sheet"
      visible={visible}
      onClose={onClose}
      icon={ListOrderedIcon}
      iconTone="brand"
      title={t('home.orderSheet.title')}
      subtitle={t('home.orderSheet.subtitle')}
      scrollable
      footer={
        <View className="flex-row gap-2.5">
          <Button testID="home-order-reset" className="flex-1" variant="soft" size="lg" label={t('home.orderSheet.reset')} onPress={() => setIds(available.map((m) => m.id))} />
          <Button testID="home-order-done" className="flex-[1.4]" size="lg" label={t('home.orderSheet.done')} onPress={done} />
        </View>
      }
    >
      {(items.length ? items : modules).map((module, index, list) => (
        <OrderRow
          key={module.id}
          module={module}
          first={index === 0}
          last={index === list.length - 1}
          onMove={(delta) => setIds(moveItem(list.map((m) => m.id), index, delta))}
        />
      ))}
    </BottomSheet>
  );
}

function OrderRow({ module, first, last, onMove }: { module: HomeModule; first: boolean; last: boolean; onMove: (delta: number) => void }) {
  const { t } = useTranslation();
  const tone = useGroupTone(module.group);
  const label = useModuleLabel();
  const name = label(module);
  return (
    <View testID={`home-order-${module.id}`} className="min-h-[48px] flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-[11px]" style={tone.box}>
        <ModuleIcon module={module} size={18} color={tone.icon} />
      </View>
      <Text weight="medium" numberOfLines={1} className="flex-1 text-ink" style={{ fontSize: 14, lineHeight: 19 }}>
        {name}
      </Text>
      <ArrowButton icon={ArrowUpIcon} label={t('home.orderSheet.moveUp', { name })} disabled={first} onPress={() => onMove(-1)} />
      <ArrowButton icon={ArrowDownIcon} label={t('home.orderSheet.moveDown', { name })} disabled={last} onPress={() => onMove(1)} />
    </View>
  );
}

function ArrowButton({ icon, label, disabled, onPress }: { icon: AppIcon; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-[12px] bg-panel active:opacity-70"
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <Icon icon={icon} size={18} color="ink-2" />
    </Pressable>
  );
}
