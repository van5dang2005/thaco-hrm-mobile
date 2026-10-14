import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatMinutes } from '@/core/time/vn';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, TriangleAlertIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import type { ExtendOption } from '../utils/booking';

type ExtendProps = {
  /** The three quick chips (+15′, +30′, +60′). */
  options: ExtendOption[];
  /** End minute of the meeting today (chips show "+N′" from it). */
  endMin: number;
  value?: number;
  onChange: (minutes: number) => void;
  /** "Khác": pick any quarter hour. A custom choice shows in that chip. */
  onOther: () => void;
  roomName: string;
  /** Room free until (minute of day), for the note under the chips. */
  freeUntil: number | null;
};

/** "Gia hạn cuộc họp · Chỉ trong hôm nay" (6c): +15′ / +30′ / +60′ / Khác, then whether the room is free. */
export function ExtendCard({ options, endMin, value, onChange, onOther, roomName, freeUntil }: ExtendProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const custom = value !== undefined && !options.some((o) => o.minutes === value);
  const fits = value !== undefined && freeUntil !== null && value <= freeUntil;
  return (
    <Card className="gap-3 p-4" testID="extend-card">
      <View className="flex-row items-center justify-between">
        <Text weight="bold" accessibilityRole="header" style={{ fontSize: 15, lineHeight: 20 }}>
          {t('meeting.extendTitle')}
        </Text>
        <Text className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
          {t('meeting.sameDay')}
        </Text>
      </View>
      <View className="flex-row gap-2">
        {options.map((option) => (
          <Chip
            key={option.minutes}
            testID={`extend-${formatMinutes(option.minutes)}`}
            top={`+${option.minutes - endMin}′`}
            bottom={formatMinutes(option.minutes)}
            selected={value === option.minutes && !option.taken}
            disabled={option.taken}
            onPress={() => onChange(option.minutes)}
          />
        ))}
        <Chip testID="extend-other" top="···" bottom={custom ? formatMinutes(value!) : t('meeting.other')} selected={custom} onPress={onOther} />
      </View>
      {value !== undefined ? (
        <View className="flex-row items-center gap-2 rounded-[12px] px-3 py-2.5" style={{ backgroundColor: fits ? colors['success-tint'] : colors['warning-tint'] }}>
          <Icon icon={fits ? CheckIcon : TriangleAlertIcon} size={14} weight="bold" rawColor={fits ? colors.success : colors.warning} />
          <Text className="flex-1" style={{ fontSize: 12.5, lineHeight: 17, color: fits ? colors['success-text'] : colors['warning-text'] }}>
            {fits || freeUntil === null ? t('meeting.freeUntil', { room: roomName, time: formatMinutes(freeUntil ?? value) }) : t('meeting.takenAt', { room: roomName, time: formatMinutes(freeUntil) })}
          </Text>
        </View>
      ) : (
        <Text className="text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
          {t('meeting.extendNone')}
        </Text>
      )}
    </Card>
  );
}

function Chip({ top, bottom, selected, disabled, onPress, testID }: { top: string; bottom: string; selected: boolean; disabled?: boolean; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  const fg = selected ? colors['on-primary'] : disabled ? colors['disabled-text'] : colors.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className="h-[54px] min-w-0 flex-1 items-center justify-center gap-0.5 rounded-[12px] active:opacity-80"
      style={{ backgroundColor: selected ? colors.primary : colors.panel }}
    >
      <Text mono weight="bold" maxFontSizeMultiplier={1.15} style={{ fontSize: 15, lineHeight: 19, color: fg, textDecorationLine: disabled ? 'line-through' : 'none' }}>
        {top}
      </Text>
      <Text mono maxFontSizeMultiplier={1.15} style={{ fontSize: 11, lineHeight: 14, color: selected ? colors['on-primary'] : colors.muted, opacity: selected ? 0.85 : 1, textDecorationLine: disabled ? 'line-through' : 'none' }}>
        {bottom}
      </Text>
    </Pressable>
  );
}
