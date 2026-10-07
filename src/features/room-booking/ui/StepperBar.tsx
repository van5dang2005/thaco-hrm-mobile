import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

export type StepNumber = 1 | 2 | 3 | 4;

const STEPS = ['room', 'time', 'details', 'confirm'] as const;
const CIRCLE = 28;
const LINK_GAP = 4;
const white = (alpha: number) => `rgba(255, 255, 255, ${alpha})`;

type Props = {
  current: StepNumber;
  /** Called with a finished step; steps after `current` are not pressable. */
  onStepPress?: (step: StepNumber) => void;
  testID?: string;
};

/** 4-step progress bar for the blue wizard header: finished · current · upcoming. */
export function StepperBar({ current, onStepPress, testID = 'stepper' }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const column = width / STEPS.length;
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View testID={testID} onLayout={onLayout} className="flex-row" style={{ paddingTop: 10, paddingHorizontal: 4, paddingBottom: 2 }}>
      {column > 0
        ? STEPS.slice(1).map((_, i) => (
            <View
              key={`link-${i}`}
              pointerEvents="none"
              testID={`${testID}-link-${i + 1}`}
              style={{
                position: 'absolute',
                top: 10 + CIRCLE / 2 - 1,
                left: 4 + column * (i + 0.5) + CIRCLE / 2 + LINK_GAP,
                width: column - CIRCLE - LINK_GAP * 2,
                height: 2,
                borderRadius: 1,
                backgroundColor: i + 2 <= current ? '#FFFFFF' : white(0.28),
              }}
            />
          ))
        : null}
      {STEPS.map((key, i) => {
        const step = (i + 1) as StepNumber;
        const done = step < current;
        const active = step === current;
        const label = t(`booking.steps.${key}`);
        const pressable = done && !!onStepPress;
        return (
          <Pressable
            key={key}
            testID={`${testID}-${step}`}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: active, disabled: !pressable }}
            disabled={!pressable}
            onPress={() => onStepPress?.(step)}
            className="flex-1 items-center active:opacity-80"
            style={{ gap: 6 }}
          >
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: CIRCLE,
                height: CIRCLE,
                backgroundColor: done || active ? '#FFFFFF' : 'transparent',
                borderWidth: done || active ? 0 : 1.5,
                borderColor: white(0.4),
                boxShadow: active ? `0px 0px 0px 4px ${white(0.22)}` : undefined,
              }}
            >
              {done ? (
                <Icon icon={CheckIcon} size={12} weight="bold" rawColor={colors.header} />
              ) : (
                <Text
                  numeric
                  weight={active ? 'bold' : 'semibold'}
                  maxFontSizeMultiplier={1.2}
                  style={{ fontSize: 13, lineHeight: 16, color: active ? colors.header : white(0.7) }}
                >
                  {String(step)}
                </Text>
              )}
            </View>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.15}
              weight={active ? 'bold' : done ? 'medium' : 'regular'}
              style={{ fontSize: 11.5, lineHeight: 15, color: active ? '#FFFFFF' : done ? '#D4E3F2' : white(0.6) }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "2/4" in the toolbar corner, replaces the old dots. */
export function StepCounter({ current, total = 4 }: { current: StepNumber; total?: number }) {
  const { t } = useTranslation();
  return (
    <Text
      mono
      weight="medium"
      maxFontSizeMultiplier={1.2}
      accessibilityLabel={t('booking.stepOf', { current, total })}
      className="pr-1"
      style={{ fontSize: 12, lineHeight: 16, color: '#D4E3F2' }}
    >
      {`${current}/${total}`}
    </Text>
  );
}
