import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon } from '@/shared/ui/icons';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { SwitchRow } from '@/shared/ui/SwitchRow';
import { Text } from '@/shared/ui/Text';

import { type HomeLayout, homeLayouts, useEffectiveHomePrefs, useHomePrefs } from './prefs';

type Props = { visible: boolean; onClose: () => void };

/**
 * "Giao diện trang chủ" (2h). Choices are kept as a draft that the home screen previews behind the
 * sheet; "Áp dụng" saves them, closing any other way discards them.
 */
export function HomeLayoutSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { layout, showProfile } = useEffectiveHomePrefs();
  const startDraft = useHomePrefs((s) => s.startDraft);
  const updateDraft = useHomePrefs((s) => s.updateDraft);
  const applyDraft = useHomePrefs((s) => s.applyDraft);
  const discardDraft = useHomePrefs((s) => s.discardDraft);

  useEffect(() => {
    if (!visible) return;
    startDraft();
    // Unmounting with the sheet open (e.g. sign-out) must not leave a preview behind.
    return discardDraft;
  }, [visible, startDraft, discardDraft]);

  const apply = () => {
    applyDraft();
    onClose();
  };

  return (
    <BottomSheet
      testID="home-layout-sheet"
      visible={visible}
      onClose={onClose}
      title={t('home.layoutSheet.title')}
      footer={<Button testID="home-layout-apply" label={t('home.layoutSheet.apply')} size="lg" onPress={apply} />}
    >
      <Text className="-mt-3 text-sub text-muted">{t('home.layoutSheet.subtitle')}</Text>
      <View className="flex-row gap-2" accessibilityRole="radiogroup">
        {homeLayouts.map((option) => (
          <LayoutOption key={option} layout={option} selected={option === layout} onPress={() => updateDraft({ layout: option })} />
        ))}
      </View>
      <SwitchRow
        testID="home-layout-show-profile"
        label={t('home.layoutSheet.showProfile')}
        value={showProfile}
        onChange={(value) => updateDraft({ showProfile: value })}
      />
    </BottomSheet>
  );
}

function LayoutOption({ layout, selected, onPress }: { layout: HomeLayout; selected: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const name = t(`home.layouts.${layout}.name`);
  return (
    <Pressable
      testID={`home-layout-${layout}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${t(`home.layouts.${layout}.description`)}`}
      onPress={onPress}
      className={cn('flex-1 gap-2 rounded-[16px] p-2', selected ? 'border-2 border-primary bg-selected-tint' : 'border border-line bg-surface')}
      // Keep the content in place when the border grows from 1 to 2.
      style={selected ? undefined : { padding: 9 }}
    >
      <Thumbnail layout={layout} />
      <View className="flex-row items-center justify-between gap-1 px-0.5">
        <Text weight="semibold" numberOfLines={1} className="flex-shrink text-sub">
          {name}
        </Text>
        <Radio selected={selected} />
      </View>
      <Text className="px-0.5 pb-0.5 text-meta-sm text-muted">{t(`home.layouts.${layout}.description`)}</Text>
    </Pressable>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return selected ? (
    <View className="h-[18px] w-[18px] items-center justify-center rounded-full bg-primary">
      <Icon icon={CheckIcon} size={10} weight="bold" color="on-primary" />
    </View>
  ) : (
    <View className="h-[18px] w-[18px] rounded-full border-2 border-line-strong" />
  );
}

/** 76px sketch of each layout, drawn with Views so it follows the theme. */
function Thumbnail({ layout }: { layout: HomeLayout }) {
  const { colors } = useTheme();
  const box = 'h-[76px] w-full justify-center rounded-[10px] bg-bg p-2';

  if (layout === 'grid') {
    return (
      <View className={box} style={{ rowGap: 6 }}>
        {[0, 1, 2].map((row) => (
          <View key={row} className="flex-row justify-around">
            {[0, 1, 2].map((col) => (
              <View key={col} className="h-4 w-4 rounded-full bg-thumb-dot" />
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (layout === 'grouped') {
    const tiles = (count: number, alt: boolean) => (
      <View className="flex-row" style={{ columnGap: 4 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <View key={i} className="h-3 flex-1 rounded-[4px]" style={{ backgroundColor: i < count ? colors[alt ? 'thumb-dot-alt' : 'thumb-dot'] : 'transparent' }} />
        ))}
      </View>
    );
    return (
      <View className={box} style={{ rowGap: 4 }}>
        <View className="h-[3px] w-6 rounded-[2px] bg-line-strong" />
        {tiles(4, false)}
        <View className="mt-[3px] h-[3px] w-5 rounded-[2px] bg-line-strong" />
        {tiles(2, true)}
      </View>
    );
  }

  return (
    <View className={box} style={{ rowGap: 5 }}>
      {[0, 1, 2].map((row) => (
        <View key={row} className="flex-row" style={{ columnGap: 5 }}>
          {[0, 1].map((col) => (
            <View key={col} className="h-4 flex-1 flex-row items-center gap-[3px] rounded-[5px] border border-track bg-surface px-[3px]">
              <View className="h-[9px] w-[9px] rounded-[3px] bg-thumb-dot" />
              <View className="h-[3px] flex-1 rounded-[2px] bg-track" />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
