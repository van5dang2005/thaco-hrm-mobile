import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatMinutes } from '@/core/time/vn';
import { Text } from '@/shared/ui/Text';

import { isPickable, isPointPickable, pointMinute, type Slot, type SlotRange } from '../utils/availability';

const COLUMNS = 4;

type Props = {
  slots: Slot[];
  range: SlotRange | null;
  onPress: (index: number) => void;
};

/**
 * 4-column grid of time points every 30 minutes, up to closing time (4b). The start and end times
 * are solid primary, the times in between are tinted.
 */
export function SlotGrid({ slots, range, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const points = slots.length ? Array.from({ length: slots.length + 1 }, (_, i) => i) : [];
  const rows: number[][] = [];
  for (let i = 0; i < points.length; i += COLUMNS) rows.push(points.slice(i, i + COLUMNS));
  const endPoint = range && !range.awaitingEnd ? range.end + 1 : null;

  return (
    <View className="gap-2" testID="slot-grid">
      {rows.map((row, r) => (
        <View key={r} className="flex-row gap-2">
          {row.map((index) => {
            // The closing-time point has no slot after it: it can only end a range.
            const slot: Slot | undefined = slots[index];
            const state = slot?.state ?? 'closed';
            const pickable = isPointPickable(range, index, slots);
            const edge = !!range && (index === range.start || index === endPoint);
            const inside = endPoint !== null && !!range && index > range.start && index < endPoint;
            const label = formatMinutes(pointMinute(slots, index));

            const style = edge
              ? { backgroundColor: colors.primary, borderColor: colors.primary, color: colors['on-primary'] }
              : inside
                ? { backgroundColor: colors['primary-tint-2'], borderColor: colors['primary-tint-2'], color: colors['primary-tint-text'] }
                : pickable
                  ? { backgroundColor: colors.surface, borderColor: isPickable(slot) && state === 'pending' ? colors.warning : colors['input-border'], color: colors.ink }
                  : { backgroundColor: colors['off-tint'], borderColor: colors['off-tint'], color: colors['disabled-text'] };

            return (
              <Pressable
                key={index}
                testID={`slot-${label}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: !pickable, selected: edge || inside }}
                accessibilityLabel={`${label}, ${t(`booking.slotState.${pickable ? (state === 'pending' ? 'pending' : 'free') : state}`)}`}
                disabled={!pickable}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onPress(index);
                }}
                className="h-11 flex-1 items-center justify-center rounded-[12px] border active:opacity-80"
                style={{ backgroundColor: style.backgroundColor, borderColor: style.borderColor, borderStyle: pickable && state === 'pending' && !edge && !inside ? 'dashed' : 'solid' }}
              >
                <Text
                  mono
                  weight="semibold"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                  className="text-body"
                  style={{ color: style.color, textDecorationLine: !pickable && state === 'taken' ? 'line-through' : 'none' }}
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
