import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';

import { Icon } from './Icon';
import { CheckIcon } from './icons';
import { onBlue } from './ScreenShell';
import { canGoToStep, isConnectorDone, stepState } from './stepper';
import { Text } from './Text';

type Props = {
  /** 0-based active step. */
  step: number;
  labels: string[];
  /** Called with a completed step's index (go back to it). */
  onStepPress?: (index: number) => void;
  testID?: string;
};

const CIRCLE = 32;

/**
 * Wizard stepper on the blue header (design 4a–4d): a white 12% block (radius 16) with one column per
 * step. Done = #2E7BC4 disc with ✓, current = white disc with a 5px halo, todo = white 35% outline.
 * Connectors are white 85% once passed, 22% otherwise. Tapping a done step goes back to it.
 */
export function Stepper4({ step, labels, onStepPress, testID }: Props) {
  const { colors } = useTheme();
  const white = colors['header-name'];
  return (
    <View testID={testID} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: labels.length, now: step + 1 }} className="flex-row rounded-[16px] px-1 pb-2 pt-2.5" style={{ backgroundColor: onBlue(0.12) }}>
      {labels.map((label, index) => {
        const state = stepState(index, step);
        const reachable = canGoToStep(index, step) && !!onStepPress;
        const lineStyle = { position: 'absolute' as const, top: CIRCLE / 2 - 1, height: 2 };
        return (
          <Pressable
            key={label}
            testID={testID ? `${testID}-${index}` : undefined}
            accessibilityRole="button"
            accessibilityState={{ disabled: !reachable, selected: state === 'current' }}
            accessibilityLabel={`${index + 1}. ${label}`}
            disabled={!reachable}
            onPress={() => onStepPress?.(index)}
            className="min-w-0 flex-1 items-center gap-1.5"
          >
            {/* One piece from this circle to the next column's circle (two semi-transparent halves would show a seam). */}
            {index < labels.length - 1 ? (
              <View style={[lineStyle, { left: '50%', right: '-50%', marginLeft: CIRCLE / 2 + 4, marginRight: CIRCLE / 2 + 4, backgroundColor: onBlue(isConnectorDone(index, step) ? 0.85 : 0.22) }]} />
            ) : null}
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: CIRCLE,
                height: CIRCLE,
                ...(state === 'done'
                  ? { backgroundColor: colors['stepper-done'], borderWidth: 1.5, borderColor: onBlue(0.85) }
                  : state === 'current'
                    ? { backgroundColor: white, boxShadow: `0px 0px 0px 5px ${onBlue(0.2)}` }
                    : { borderWidth: 1.5, borderColor: onBlue(0.35) }),
              }}
            >
              {state === 'done' ? (
                <Icon icon={CheckIcon} size={16} weight="bold" rawColor={white} />
              ) : (
                <Text mono weight="bold" maxFontSizeMultiplier={1} style={{ fontSize: 13, lineHeight: 16, color: state === 'current' ? colors.header : onBlue(0.7) }}>
                  {String(index + 1)}
                </Text>
              )}
            </View>
            <Text
              weight={state === 'current' ? 'bold' : 'semibold'}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              style={{ fontSize: 11.5, lineHeight: 15, color: state === 'todo' ? onBlue(0.55) : white }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
