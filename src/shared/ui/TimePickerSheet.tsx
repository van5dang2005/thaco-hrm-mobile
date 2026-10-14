import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatMinutes } from '@/core/time/vn';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Minutes since midnight. */
  value: number;
  onSelect: (minutes: number) => void;
  /** Latest selectable time (inclusive, minutes since midnight); later picks keep "Xong" disabled. */
  max?: number;
  /** Optional second action next to "Xong" (e.g. "Bây giờ"). */
  extraLabel?: string;
  onExtra?: () => void;
  testID?: string;
};

const ITEM = 44;
const VISIBLE = 5;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const pad = (n: number) => String(n).padStart(2, '0');

/** Hour and minute wheels (any minute, not fixed slots), centred on `value` each time the sheet opens. */
export function TimePickerSheet({ visible, onClose, title, value, onSelect, max, extraLabel, onExtra, testID }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [hour, setHour] = useState(Math.floor(value / 60));
  const [minute, setMinute] = useState(value % 60);
  const [wasVisible, setWasVisible] = useState(visible);

  // Start from the field's value each time the sheet opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setHour(Math.floor(value / 60));
      setMinute(value % 60);
    }
  }

  const total = hour * 60 + minute;
  const tooLate = max !== undefined && total > max;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      testID={testID}
      footer={
        <View className="flex-row gap-2.5">
          {extraLabel && onExtra ? (
            <Button
              testID={testID ? `${testID}-extra` : undefined}
              className="flex-1"
              variant="soft"
              label={extraLabel}
              onPress={() => {
                onExtra();
                onClose();
              }}
            />
          ) : null}
          <Button
            testID={testID ? `${testID}-done` : undefined}
            className="flex-[1.4]"
            label={t('common.done')}
            disabled={tooLate}
            onPress={() => {
              onSelect(total);
              onClose();
            }}
          />
        </View>
      }
    >
      <View className="flex-row items-center justify-center" style={{ height: ITEM * VISIBLE }}>
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 rounded-[12px]"
          style={{ top: ITEM * 2, height: ITEM, backgroundColor: colors['primary-tint'] }}
        />
        <Wheel testID={testID ? `${testID}-hour` : undefined} label={t('common.hour')} values={HOURS} value={hour} onChange={setHour} />
        <Text mono weight="bold" className="text-primary" style={{ fontSize: 22, lineHeight: 28 }}>
          :
        </Text>
        <Wheel testID={testID ? `${testID}-minute` : undefined} label={t('common.minute')} values={MINUTES} value={minute} onChange={setMinute} />
      </View>
      {tooLate ? (
        <Text className="text-center text-meta text-danger">{t('common.timeAfterMax', { time: formatMinutes(max ?? 0) })}</Text>
      ) : null}
    </BottomSheet>
  );
}

/** One snapping column; tap a row to jump to it. VoiceOver / TalkBack can step it up and down. */
function Wheel({ values, value, onChange, label, testID }: { values: number[]; value: number; onChange: (value: number) => void; label: string; testID?: string }) {
  const { colors } = useTheme();
  const ref = useRef<ScrollView>(null);
  const index = Math.max(0, values.indexOf(value));
  const [center, setCenter] = useState(index);

  const clampIndex = (y: number) => Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM)));
  const scrollTo = (i: number, animated: boolean) => ref.current?.scrollTo({ y: i * ITEM, animated });
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = clampIndex(event.nativeEvent.contentOffset.y);
    setCenter(i);
    if (values[i] !== value) onChange(values[i]);
  };
  const jump = (i: number) => {
    const next = Math.min(values.length - 1, Math.max(0, i));
    setCenter(next);
    onChange(values[next]);
    scrollTo(next, true);
  };

  return (
    <ScrollView
      ref={ref}
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: pad(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => jump(index + (event.nativeEvent.actionName === 'increment' ? 1 : -1))}
      style={{ width: 84, height: ITEM * VISIBLE }}
      contentContainerStyle={{ paddingVertical: ITEM * 2 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      nestedScrollEnabled
      scrollEventThrottle={16}
      // contentOffset is iOS-only, so position the wheel once it has a size.
      onLayout={() => scrollTo(index, false)}
      onScroll={(event) => setCenter(clampIndex(event.nativeEvent.contentOffset.y))}
      onMomentumScrollEnd={settle}
      onScrollEndDrag={(event) => {
        // A slow release has no momentum phase, so settle here too.
        if (Math.abs(event.nativeEvent.velocity?.y ?? 0) < 0.05) settle(event);
      }}
    >
      {values.map((v, i) => {
        const active = i === center;
        return (
          <Pressable key={v} onPress={() => jump(i)} style={{ height: ITEM }} className="items-center justify-center" importantForAccessibility="no">
            <Text mono weight={active ? 'bold' : 'medium'} style={{ fontSize: active ? 22 : 18, lineHeight: 28, color: active ? colors['primary-tint-text'] : colors.subtle }}>
              {pad(v)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
