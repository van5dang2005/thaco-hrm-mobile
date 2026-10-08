import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { addDays, parseDateKey, weekdayOf, type DateKey } from '@/core/time/vn';
import { Text } from '@/shared/ui/Text';

import { meetingDots, weekKeys, weekStartOf } from '../myMeetings';
import type { BookingDto } from '../types';
import { onBlue } from '@/shared/ui/ScreenShell';

const WEEKS_BEFORE = 12;
const WEEKS_TOTAL = 52;

type Props = {
  /** Monday of the week on screen. */
  weekStart: DateKey;
  onWeekChange: (start: DateKey) => void;
  value: DateKey;
  onChange: (key: DateKey) => void;
  today: DateKey;
  /** Bookings used for the dots under each day. */
  bookings: BookingDto[];
  testID?: string;
};

/** Week of day cells on the blue header (5b, v3 cells like DayStrip); swipe sideways to change week. */
export function WeekStrip({ weekStart, onWeekChange, value, onChange, today, bookings, testID = 'week' }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const listRef = useRef<FlatList<DateKey>>(null);
  const base = weekStartOf(today);
  const weeks = Array.from({ length: WEEKS_TOTAL }, (_, i) => addDays(base, (i - WEEKS_BEFORE) * 7));
  const index = Math.max(0, weeks.indexOf(weekStart));

  // Follow weekStart when it changes from outside (selecting a day of another week).
  useEffect(() => {
    if (width) listRef.current?.scrollToIndex({ index, animated: false });
  }, [index, width]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View testID={testID} onLayout={onLayout} accessibilityRole="tablist">
      {width > 0 ? (
        <FlatList
          ref={listRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={weeks}
          keyExtractor={(w) => w}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(event) => {
            const next = weeks[Math.round(event.nativeEvent.contentOffset.x / width)];
            if (next && next !== weekStart) onWeekChange(next);
          }}
          renderItem={({ item: start }) => (
            <View style={{ width }} className="flex-row gap-1">
              {weekKeys(start).map((key) => {
                const selected = key === value;
                const weekday = weekdayOf(key);
                const weekend = weekday === 0 || weekday === 6;
                const dots = meetingDots(bookings, key);
                const fg = selected ? colors.header : colors['header-name'];
                return (
                  <Pressable
                    key={key}
                    testID={`${testID}-${key}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${t(`time.weekday.${String(weekday) as '0'}`)} ${parseDateKey(key).day}${dots ? `, ${t('booking.hasMeetings')}` : ''}`}
                    onPress={() => onChange(key)}
                    className="h-14 flex-1 items-center justify-center gap-0.5 rounded-[14px] active:opacity-80"
                    style={{ backgroundColor: selected ? colors['header-name'] : 'transparent', opacity: !selected && weekend ? 0.45 : 1 }}
                  >
                    <Text weight={selected ? 'bold' : 'medium'} numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: 11, lineHeight: 14, color: selected ? colors.header : onBlue(0.75) }}>
                      {t(`time.weekdayShort.${String(weekday) as '0'}`)}
                    </Text>
                    <Text weight="bold" numeric maxFontSizeMultiplier={1.2} style={{ color: fg, fontSize: 18, lineHeight: 22 }}>
                      {String(parseDateKey(key).day).padStart(2, '0')}
                    </Text>
                    <View className="h-1 flex-row gap-[3px]">
                      {Array.from({ length: dots }, (_, i) => (
                        <View key={i} className="h-1 w-1 rounded-full" style={{ backgroundColor: selected ? colors.header : onBlue(0.8) }} />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      ) : (
        <View style={{ height: 56 }} />
      )}
    </View>
  );
}
