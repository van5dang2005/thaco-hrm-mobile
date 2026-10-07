import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { DEFAULT_UI_FONT, fontStyle, uiFontOrder, uiFonts, type UiFont } from '@/core/theme/fonts';
import { preloadAllUiFonts, useFontStore } from '@/core/theme/fontStore';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui/Icon';
import { CheckCircleIcon } from '@/shared/ui/icons';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Text } from '@/shared/ui/Text';

export function useUiFontName() {
  const { t } = useTranslation();
  return (font: UiFont) => (font === 'system' ? t('profile.fontSystem') : uiFonts[font].name);
}

/** Font picker: every option is previewed in its own typeface, so users choose by look. */
export function FontSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const current = useFontStore((s) => s.font);
  const setFont = useFontStore((s) => s.setFont);
  const fontName = useUiFontName();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (visible && !ready) void preloadAllUiFonts().then(() => setReady(true));
  }, [visible, ready]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('profile.font')} scrollable testID="font-sheet">
      {ready ? (
        <View className="gap-2.5">
          {uiFontOrder.map((font) => {
            const selected = font === current;
            return (
              <Pressable
                key={font}
                testID={`font-option-${font}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  void setFont(font);
                  onClose();
                }}
                className={cn(
                  'flex-row items-center gap-3 rounded-card px-4 py-3.5 active:opacity-80',
                  selected ? 'border-2 border-primary bg-primary-tint' : 'border border-line bg-surface',
                )}
              >
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <Text style={fontStyle(font, 'semibold')} className="text-card">
                      {fontName(font)}
                    </Text>
                    {font === DEFAULT_UI_FONT ? (
                      <View className="rounded-chip bg-primary px-2 py-0.5">
                        <Text weight="semibold" className="text-[11px] leading-[14px] text-on-primary">
                          {t('profile.fontDefault')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={fontStyle(font, 'regular')} className="text-body text-ink-2" numberOfLines={1}>
                    {t('profile.fontPreview')}
                  </Text>
                </View>
                {selected ? <Icon icon={CheckCircleIcon} size={24} weight="fill" color="primary" /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="items-center py-10">
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </BottomSheet>
  );
}
