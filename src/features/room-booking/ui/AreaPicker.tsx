import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { sameId } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { CaretDownIcon, MapPinIcon } from '@/shared/ui/icons';
import { SelectSheet } from '@/shared/ui/SelectSheet';
import { Text } from '@/shared/ui/Text';

import { rememberArea, useAreas } from '../hooks';

/** "📍 THACO Chu Lai ⌄" row on the blue header; opens the area list (GET /api/areas). `right` sits at the row's end. */
export function AreaPicker({ areaId, onChange, right, testID }: { areaId?: string; onChange: (areaId: string) => void; right?: ReactNode; testID?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const areas = useAreas();
  const [open, setOpen] = useState(false);
  const area = areas.data?.find((a) => sameId(a.id, areaId));
  const fg = colors['header-job'];

  return (
    <View className="flex-row items-center gap-2 pr-2.5">
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${t('booking.area')}: ${area?.name ?? t('rooms.chooseArea')}`}
        onPress={() => setOpen(true)}
        hitSlop={8}
        className="min-h-[32px] flex-shrink flex-row items-center gap-1.5 px-2.5 pt-1 active:opacity-70"
      >
        <Icon icon={MapPinIcon} size={16} rawColor={fg} />
        <Text numberOfLines={1} className="flex-shrink text-sub" style={{ color: fg }}>
          {area?.name ?? t('rooms.chooseArea')}
        </Text>
        <Icon icon={CaretDownIcon} size={14} rawColor={fg} />
      </Pressable>
      {right ? <View className="ml-auto pt-1">{right}</View> : null}
      <SelectSheet
        testID={testID ? `${testID}-sheet` : undefined}
        visible={open}
        onClose={() => setOpen(false)}
        title={t('rooms.chooseArea')}
        value={areaId}
        options={(areas.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
        onSelect={(value) => {
          rememberArea(value);
          onChange(value);
        }}
      />
    </View>
  );
}
