import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';

import { onBlue, useHeaderColors } from './ScreenShell';
import { Text } from './Text';
import type { BadgeKind } from './status';

/** Status dot colors readable on the blue header, one per badge kind. */
export function useHeaderDot(kind: BadgeKind) {
  const { colors } = useTheme();
  const dots: Record<BadgeKind, string> = {
    wait: colors['header-dot-wait'],
    warn: colors['header-dot-warn'],
    danger: colors['header-dot-danger'],
    ok: colors['header-dot-live'],
    off: colors['header-dot-off'],
    live: colors['header-dot-live'],
  };
  return dots[kind];
}

/** 26pt translucent pill with an optional status dot, for status and tags on the blue header. */
export function HeaderPill({ label, dotColor, testID }: { label: string; dotColor?: string; testID?: string }) {
  const { fg } = useHeaderColors();
  return (
    <View testID={testID} className="h-[26px] flex-shrink flex-row items-center gap-1.5 rounded-full px-2.5" style={{ backgroundColor: onBlue(0.14) }}>
      {dotColor ? <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: dotColor }} /> : null}
      <Text weight="semibold" numberOfLines={1} className="flex-shrink" maxFontSizeMultiplier={1.2} style={{ fontSize: 12, lineHeight: 16, color: fg }}>
        {label}
      </Text>
    </View>
  );
}
