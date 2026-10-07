import { forwardRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { MAX_FONT_SCALE } from '@/core/theme/fonts';
import { useFontStyle } from '@/core/theme/fontStore';
import type { ColorToken } from '@/core/theme/palette';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import { type AppIcon, CaretDownIcon } from './icons';
import { Text } from './Text';

type BaseProps = {
  label?: string;
  error?: string;
  hint?: string;
  mono?: boolean;
  /** Right-hand accessory (eye toggle, unit…). */
  right?: ReactNode;
  /** Left-hand fixed text (e.g. the locked sequence prefix of a tracking number). */
  left?: ReactNode;
  leftIcon?: AppIcon;
  /** Background behind the Android floating label; must match the screen behind the field. */
  labelBackground?: ColorToken;
  containerClassName?: string;
  /** Force a layout regardless of platform. */
  appearance?: 'ios' | 'android';
  /** Filled 52pt field of the unified design (6a): grey fill at rest, white with a 1.5 primary border and a 4pt ring on focus. */
  filled?: boolean;
};

type InputProps = BaseProps & TextInputProps & { onPress?: undefined; value?: string };

type SelectProps = BaseProps & {
  /** Renders a tappable field that opens a picker instead of a text input. */
  onPress: () => void;
  value?: string;
  placeholder?: string;
  testID?: string;
  multiline?: boolean;
};

export type TextFieldProps = InputProps | SelectProps;

function isSelect(props: TextFieldProps): props is SelectProps {
  return typeof props.onPress === 'function';
}

/** Strips field-only props so nothing unserialisable (React elements, components) reaches the native input. */
function inputPropsOf(props: InputProps): TextInputProps {
  const { label, error, hint, mono, right, left, leftIcon, labelBackground, containerClassName, appearance, filled, onPress, ...input } = props;
  void [label, error, hint, mono, right, left, leftIcon, labelBackground, containerClassName, appearance, filled, onPress];
  return input;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(props, ref) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const {
    label,
    error,
    hint,
    mono,
    right,
    left,
    leftIcon,
    labelBackground = 'surface',
    containerClassName,
    filled,
    appearance = filled ? 'ios' : Platform.OS === 'android' ? 'android' : 'ios',
  } = props;
  const android = appearance === 'android';
  const inputFont = useFontStyle(mono ? 'medium' : 'regular', mono);
  const multiline = !!props.multiline;
  const borderClass = error
    ? 'border-danger border-[1.5px]'
    : focused
      ? cn('border-primary', android ? 'border-2' : 'border-[1.5px]')
      : filled
        ? 'border border-line-2'
        : 'border border-input-border';
  const minHeight = multiline ? 70 : android ? 56 : 52;

  const content = isSelect(props) ? (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={props.onPress}
      className="flex-1 flex-row items-center gap-3 self-stretch"
    >
      <Text
        mono={mono}
        weight={mono ? 'medium' : 'regular'}
        numberOfLines={multiline ? 3 : 1}
        className={cn('flex-1 text-card', !props.value && 'text-subtle')}
      >
        {props.value || props.placeholder || ''}
      </Text>
      {right ?? <Icon icon={CaretDownIcon} size={16} color="subtle" />}
    </Pressable>
  ) : (
    <>
      <TextInput
        ref={ref}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        placeholderTextColor={colors.subtle}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...inputPropsOf(props as InputProps)}
        onFocus={(event) => {
          setFocused(true);
          (props as InputProps).onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          (props as InputProps).onBlur?.(event);
        }}
        style={[
          {
            flex: 1,
            alignSelf: 'stretch',
            color: colors.ink,
            fontSize: 15,
            ...inputFont,
            paddingVertical: multiline ? 12 : 0,
          },
          (props as InputProps).style,
        ]}
      />
      {right}
    </>
  );

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label && !android ? (
        <Text weight="medium" className={filled ? 'text-muted' : 'text-sub text-ink-2'} style={filled ? { fontSize: 13, lineHeight: 17 } : undefined}>
          {label}
        </Text>
      ) : null}
      <View className="relative">
        {focused && !android && !error ? (
          <View pointerEvents="none" className={cn('absolute -inset-1 bg-primary-tint', filled ? 'rounded-[18px]' : 'rounded-[16px]')} />
        ) : null}
        <View
          className={cn('flex-row items-center gap-2.5 px-3.5', filled ? 'rounded-button' : 'rounded-field', filled && !focused ? 'bg-field' : 'bg-surface', borderClass)}
          style={{ minHeight }}
        >
          {leftIcon ? <Icon icon={leftIcon} size={18} color={filled && focused ? 'primary' : 'subtle'} /> : null}
          {left ? <View className="-mr-2.5">{left}</View> : null}
          {content}
        </View>
        {label && android ? (
          <View pointerEvents="none" className="absolute left-3 top-[-9px] px-1" style={{ backgroundColor: colors[labelBackground] }}>
            <Text weight={focused ? 'medium' : 'regular'} className={cn('text-meta', focused ? 'text-primary' : error ? 'text-danger' : 'text-muted')}>
              {label}
            </Text>
          </View>
        ) : null}
      </View>
      {error ? (
        <Text className="text-meta text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-meta text-muted">{hint}</Text>
      ) : null}
    </View>
  );
});
