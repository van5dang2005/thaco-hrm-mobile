import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { addDays, parseDateKey, weekdayOf, type DateKey } from '@/core/time/vn';
import { Text } from '@/shared/ui/Text';

import { onBlue } from '@/shared/ui/ScreenShell';

type Props = {
  value: DateKey;
  onChange: (key: DateKey) => void;
  /** First day shown (usually today). */
  start: DateKey;
  days?: number;
  /** Days after this cannot be picked (room's `maxAdvanceRegistrationDays`). */
  maxKey?: DateKey;
  /** Days on which I have a meeting: a 5pt dot under the date. */
  marked?: ReadonlySet<DateKey>;
  /** Cells with a dot row for "has meetings" (4a); both variants are 56pt high. */
  tall?: boolean;
  testID?: string;
};

/** Seven-day picker on the blue header. */
export function DayStrip({ value, onChange, start, days = 7, maxKey, marked, tall, testID }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const keys = Array.from({ length: days }, (_, i) => addDays(start, i));

  return (
    <View testID={testID} className="flex-row gap-1.5 px-1 pt-3.5" accessibilityRole="tablist">
      {keys.map((key) => {
        const selected = key === value;
        const weekday = weekdayOf(key);
        const weekend = weekday === 0 || weekday === 6;
        const disabled = !!maxKey && key > maxKey;
        const label = t(`time.weekdayShort.${String(weekday) as '0'}`);
        const fg = selected ? colors.header : weekend ? onBlue(0.45) : colors['header-name'];
        const dot = marked?.has(key);
        return (
          <Pressable
            key={key}
            testID={`${testID ?? 'day'}-${key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={`${t(`time.weekday.${String(weekday) as '0'}`)} ${parseDateKey(key).day}${dot ? `, ${t('booking.hasMeetings')}` : ''}`}
            disabled={disabled}
            onPress={() => onChange(key)}
            className="flex-1 items-center justify-center rounded-[16px] active:opacity-80"
            style={{ height: 56, gap: tall ? 1 : 2, backgroundColor: selected ? colors['header-name'] : onBlue(0.1), opacity: disabled ? 0.35 : 1 }}
          >
            <Text weight="medium" numberOfLines={1} maxFontSizeMultiplier={1.2} className="text-meta" style={{ color: fg, opacity: selected ? 1 : 0.85 }}>
              {label}
            </Text>
            <Text weight="bold" numeric maxFontSizeMultiplier={1.2} style={{ color: fg, fontSize: tall ? 18 : 17, lineHeight: tall ? 22 : 21 }}>
              {String(parseDateKey(key).day).padStart(2, '0')}
            </Text>
            {tall ? <View className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: dot ? (selected ? colors.header : colors['header-name']) : 'transparent' }} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
