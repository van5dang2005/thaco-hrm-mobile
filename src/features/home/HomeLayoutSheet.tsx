import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, LayoutGridIcon } from '@/shared/ui/icons';
import { SwitchRow } from '@/shared/ui/SwitchRow';
import { Text } from '@/shared/ui/Text';

import { type HomeLayout, homeLayouts, useEffectiveHomePrefs, useHomePrefs } from './prefs';

type Props = { visible: boolean; onClose: () => void; /** "Sắp xếp tiện ích" (hidden when absent). */ onSort?: () => void };

/**
 * "Giao diện trang chủ" (2h). Choices are kept as a draft that the home screen previews behind the
 * sheet; "Áp dụng" saves them, closing any other way discards them.
 */
export function HomeLayoutSheet({ visible, onClose, onSort }: Props) {
  const { t } = useTranslation();
  const { layout, showTodo, showNextMeeting } = useEffectiveHomePrefs();
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

  const sort = () => {
    applyDraft();
    onClose();
    onSort?.();
  };

  return (
    <BottomSheet
      testID="home-layout-sheet"
      visible={visible}
      onClose={onClose}
      icon={LayoutGridIcon}
      iconTone="brand"
      title={t('home.layoutSheet.title')}
      subtitle={t('home.layoutSheet.subtitle')}
      footer={
        <View className="flex-row gap-2.5">
          {onSort ? <Button testID="home-layout-sort" className="flex-1" variant="soft" size="xl" label={t('home.layoutSheet.sort')} onPress={sort} /> : null}
          <Button testID="home-layout-apply" className="flex-[1.2]" size="xl" label={t('home.layoutSheet.apply')} onPress={apply} />
        </View>
      }
    >
      <View className="flex-row gap-2" accessibilityRole="radiogroup">
        {homeLayouts.map((option) => (
          <LayoutOption key={option} layout={option} selected={option === layout} onPress={() => updateDraft({ layout: option })} />
        ))}
      </View>
      <View>
        <SwitchRow
          testID="home-layout-show-todo"
          label={t('home.layoutSheet.showTodo')}
          hint={t('home.layoutSheet.showTodoHint')}
          value={showTodo}
          onChange={(value) => updateDraft({ showTodo: value })}
          className="py-1.5"
        />
        <View className="h-px bg-line-2" />
        <SwitchRow
          testID="home-layout-show-next-meeting"
          label={t('home.layoutSheet.showNextMeeting')}
          hint={t('home.layoutSheet.showNextMeetingHint')}
          value={showNextMeeting}
          onChange={(value) => updateDraft({ showNextMeeting: value })}
          className="py-1.5"
        />
      </View>
    </BottomSheet>
  );
}

function LayoutOption({ layout, selected, onPress }: { layout: HomeLayout; selected: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const name = t(`home.layouts.${layout}.name`);
  return (
    <Pressable
      testID={`home-layout-${layout}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${t(`home.layouts.${layout}.description`)}`}
      onPress={onPress}
      className="min-w-0 flex-1 gap-2 rounded-[16px] p-2 active:opacity-80"
      style={{ backgroundColor: selected ? colors.elevated : colors.panel, borderWidth: 2, borderColor: selected ? colors.primary : 'transparent' }}
    >
      <View>
        <Thumbnail layout={layout} />
        <View className="absolute right-1 top-1">
          <Radio selected={selected} />
        </View>
      </View>
      <View className="px-1 pb-0.5">
        <Text weight="bold" numberOfLines={1} style={{ fontSize: 13.5, lineHeight: 18, color: selected ? colors.primary : colors.ink }}>
          {name}
        </Text>
        <Text numberOfLines={2} className="text-muted" style={{ fontSize: 11, lineHeight: 14 }}>
          {t(`home.layouts.${layout}.description`)}
        </Text>
      </View>
    </Pressable>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return selected ? (
    <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
      <Icon icon={CheckIcon} size={11} weight="bold" color="on-primary" />
    </View>
  ) : (
    <View className="h-5 w-5 rounded-full border-[1.5px] border-line-strong bg-elevated" />
  );
}

/** 64px sketch of each layout, drawn with Views so it follows the theme. */
function Thumbnail({ layout }: { layout: HomeLayout }) {
  const box = 'h-16 w-full justify-center rounded-[10px] bg-elevated px-2';
  const block = 'rounded-[3px] bg-primary-tint-2';

  if (layout === 'grid') {
    return (
      <View className={box} style={{ rowGap: 5 }}>
        {[0, 1, 2].map((row) => (
          <View key={row} className="flex-row" style={{ columnGap: 4 }}>
            {[0, 1, 2, 3].map((col) => (
              <View key={col} className={`h-2.5 flex-1 ${block}`} />
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (layout === 'grouped') {
    return (
      <View className={box} style={{ rowGap: 6 }}>
        {[0, 1].map((row) => (
          <View key={row} className="h-[18px] flex-row items-center gap-1 rounded-[4px] border border-line px-1">
            {[0, 1, 2].map((col) => (
              <View key={col} className={`h-2 flex-1 ${block}`} />
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className={box} style={{ rowGap: 4 }}>
      <View className="flex-row" style={{ columnGap: 4 }}>
        <View className={`h-6 flex-1 ${block}`} />
        <View className={`h-6 flex-1 ${block}`} />
      </View>
      <View className={`h-3 w-1/2 ${block}`} />
    </View>
  );
}
