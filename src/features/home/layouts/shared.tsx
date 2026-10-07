import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';
import { CountBadge } from '@/shared/ui/CountBadge';
import { Icon } from '@/shared/ui/Icon';
import { ArrowUpRightIcon } from '@/shared/ui/icons';

import type { HomeModule, ModuleGroup } from '../modules';
import type { ModuleSignals } from '../useModules';

/** Every layout renders the same filtered modules with the same signals. */
export type LayoutProps = {
  modules: HomeModule[];
  signals: ModuleSignals;
  onOpen: (module: HomeModule) => void;
};

/** Icon box / glyph colors per group (README design tokens, light and dark). */
export function useGroupTone(group: ModuleGroup) {
  const { colors, scheme } = useTheme();
  switch (group) {
    case 'meeting':
      return { box: colors['primary-tint'], icon: colors['primary-tint-text'] };
    case 'parcel':
      return { box: colors['success-tint'], icon: scheme === 'dark' ? colors['success-text'] : colors.success };
    case 'hr':
      return { box: colors['warning-tint'], icon: colors.warning };
  }
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** Empty cells that keep the last row of a grid aligned to the columns. */
export function RowPadding({ count }: { count: number }) {
  return Array.from({ length: count }, (_, i) => <View key={`pad-${i}`} className="flex-1" />);
}

/** Red count, or the black ↗ marker for modules that open another app; anchored by `className`. */
export function TileMarker({ module, count, className }: { module: HomeModule; count?: number; className: string }) {
  if (module.externalUrl) {
    return (
      // Padded ring instead of a border, so no dark hairline shows around the disc.
      <View className={cn('absolute h-5 w-5 rounded-full bg-surface p-0.5', className)}>
        <View className="flex-1 items-center justify-center rounded-full bg-inverse">
          <Icon icon={ArrowUpRightIcon} size={10} weight="bold" color="on-inverse" />
        </View>
      </View>
    );
  }
  return count ? <CountBadge count={count} className={cn('absolute', className)} ring="surface" /> : null;
}

/** Screen-reader label: "Bưu phẩm, 2" / "Chấm công, mở ứng dụng khác". */
export function useTileA11yLabel() {
  const { t } = useTranslation();
  return (module: HomeModule, label: string, count?: number, summary?: string) =>
    [label, count ? String(count) : null, summary, module.externalUrl ? t('home.opensOtherApp') : null].filter(Boolean).join(', ');
}
