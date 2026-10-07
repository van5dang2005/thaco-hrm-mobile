import type { ReactNode } from 'react';
import { View } from 'react-native';

import { onBlue, useHeaderColors } from './ScreenShell';
import { Text } from './Text';

/** Count tile on the blue header: JetBrains Mono 22/600 value over an 11.5 label. */
export function HeaderStat({ value, label, testID }: { value?: number | string | null; label: string; testID?: string }) {
  const { fg, sub } = useHeaderColors();
  return (
    <View testID={testID} className="min-w-0 flex-1 gap-0.5 rounded-[14px]" style={{ backgroundColor: onBlue(0.1), paddingVertical: 10, paddingHorizontal: 12 }}>
      <Text mono weight="semibold" numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ fontSize: 22, lineHeight: 28, color: fg }}>
        {value ?? '–'}
      </Text>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ fontSize: 11.5, lineHeight: 15, color: sub }}>
        {label}
      </Text>
    </View>
  );
}

/** Row of header stats (usually three), 8 apart. */
export function HeaderStatRow({ children }: { children: ReactNode }) {
  return <View className="flex-row gap-2 px-1 pt-2.5">{children}</View>;
}
