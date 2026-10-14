import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatMinutes } from '@/core/time/vn';
import { Text } from '@/shared/ui/Text';

import { isPickable, type Slot, type SlotRange } from '../utils/availability';

const COLUMNS = 4;

type Props = {
  slots: Slot[];
  range: SlotRange | null;
  onPress: (index: number) => void;
};

/** 4-column grid of 30-minute slots (4b). Range ends are solid primary, the inside is tinted. */
export function SlotGrid({ slots, range, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rows: Slot[][] = [];
  for (let i = 0; i < slots.length; i += COLUMNS) rows.push(slots.slice(i, i + COLUMNS));

  return (
    <View className="gap-2" testID="slot-grid">
      {rows.map((row, r) => (
        <View key={r} className="flex-row gap-2">
          {row.map((slot, c) => {
            const index = r * COLUMNS + c;
            const pickable = isPickable(slot);
            const edge = !!range && (index === range.start || index === range.end);
            const inside = !!range && index > range.start && index < range.end;
            const label = formatMinutes(slot.startMin);

            const style = edge
              ? { backgroundColor: colors.primary, borderColor: colors.primary, color: colors['on-primary'] }
              : inside
                ? { backgroundColor: colors['primary-tint-2'], borderColor: colors['primary-tint-2'], color: colors['primary-tint-text'] }
                : pickable
                  ? { backgroundColor: colors.surface, borderColor: slot.state === 'pending' ? colors.warning : colors['input-border'], color: colors.ink }
                  : { backgroundColor: colors['off-tint'], borderColor: colors['off-tint'], color: colors['disabled-text'] };

            return (
              <Pressable
                key={slot.startMin}
                testID={`slot-${label}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: !pickable, selected: edge || inside }}
                accessibilityLabel={`${label}, ${t(`booking.slotState.${slot.state}`)}`}
                disabled={!pickable}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onPress(index);
                }}
                className="h-11 flex-1 items-center justify-center rounded-[12px] border active:opacity-80"
                style={{ backgroundColor: style.backgroundColor, borderColor: style.borderColor, borderStyle: slot.state === 'pending' && !edge && !inside ? 'dashed' : 'solid' }}
              >
                <Text
                  mono
                  weight="semibold"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                  className="text-body"
                  style={{ color: style.color, textDecorationLine: slot.state === 'taken' ? 'line-through' : 'none' }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
          {Array.from({ length: COLUMNS - row.length }, (_, i) => (
            <View key={`pad-${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}
