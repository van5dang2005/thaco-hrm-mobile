import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';

import type { DocRole } from '../types';

/**
 * Role pill: Chủ trì solid primary, Phối hợp primary tint, Để biết neutral (22pt, fully rounded).
 * `task`: the colors of the web task calendar (`mauLoai`), so a task card's pill matches its stripe: Chủ trì red tint.
 */
export function RoleBadge({ role, task, testID }: { role: DocRole; task?: boolean; testID?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const look = {
    chu_tri: task ? { bg: colors['danger-tint'], fg: colors['danger-text'] } : { bg: colors.primary, fg: colors['on-primary'] },
    phoi_hop: { bg: colors['primary-tint'], fg: colors['primary-tint-text'] },
    de_biet: { bg: colors['off-tint'], fg: colors['ink-2'] },
  }[role];
  return (
    <View testID={testID} className="h-[22px] items-center justify-center self-start rounded-full px-2.5" style={{ backgroundColor: look.bg }}>
      <Text weight="semibold" numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ fontSize: 12, lineHeight: 15, color: look.fg }}>
        {t(`documents.role.${role}`)}
      </Text>
    </View>
  );
}
