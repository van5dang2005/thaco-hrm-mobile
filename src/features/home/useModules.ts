import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Platform } from 'react-native';

import { useCapabilities } from '@/core/session/capabilities';
import { useSessionStore } from '@/core/session/sessionStore';

import { filterModules } from './moduleFilter';
import { homeModules, type HomeModule } from './modules';
import type { Signal } from './signals';

/** Modules the user may see (connected services + permissions), in config order. */
export function useHomeModules() {
  const { has } = useCapabilities();
  const connected = useSessionStore((s) => s.connected);
  return filterModules(homeModules, { connected, has });
}

export type ModuleSignals = Record<string, { badge?: Signal<number>; summary?: Signal<string> }>;

/**
 * Badge and summary of every module. `homeModules` is a constant, so the hooks below run in the
 * same order on every render. Opted out of React Compiler, which only recognises `use*` names.
 */
export function useModuleSignals(): ModuleSignals {
  'use no memo';
  const signals: ModuleSignals = {};
  for (const module of homeModules) {
    signals[module.id] = { badge: module.badge?.(), summary: module.summary?.() };
  }
  return signals;
}

export function useModuleLabel() {
  const { t } = useTranslation();
  return (module: HomeModule, short = false) => t(`home.modules.${short && module.shortLabelKey ? module.shortLabelKey : module.labelKey}`);
}

export function useOpenModule() {
  const { t } = useTranslation();
  const label = useModuleLabel();

  const openExternal = async (module: HomeModule) => {
    try {
      await Linking.openURL(module.externalUrl!);
    } catch {
      const store = module.storeUrl;
      Alert.alert(
        label(module),
        t('home.externalMissing', { name: label(module) }),
        store
          ? [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('home.openStore'), onPress: () => void Linking.openURL(Platform.OS === 'ios' ? store.ios : store.android) },
            ]
          : [{ text: t('common.ok') }],
      );
    }
  };

  return (module: HomeModule) => {
    if (module.externalUrl) {
      void openExternal(module);
    } else if (module.route) {
      module.onBeforeOpen?.();
      router.push(module.route);
    } else {
      router.push({ pathname: '/coming-soon', params: { module: label(module) } });
    }
  };
}
