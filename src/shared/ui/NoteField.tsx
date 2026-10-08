import { TextInput, type TextInputProps } from 'react-native';

import { MAX_FONT_SCALE, useFontStyle } from '@/core/theme/fonts';
import { useTheme } from '@/core/theme/ThemeProvider';

type Props = Omit<TextInputProps, 'style'> & {
  /** `filled` = #F5F7FA box (sheets); `row` = borderless 48pt row inside a card (handover note). */
  variant?: 'filled' | 'row';
};

/** Free-text note / comment field (approval comment, rejection reason, handover note). */
export function NoteField({ variant = 'filled', multiline = true, ...rest }: Props) {
  const { colors } = useTheme();
  const font = useFontStyle('regular');
  const filled = variant === 'filled';
  return (
    <TextInput
      multiline={multiline}
      maxLength={500}
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      placeholderTextColor={colors.subtle}
      selectionColor={colors.primary}
      cursorColor={colors.primary}
      textAlignVertical={filled ? 'top' : 'center'}
      {...rest}
      style={{
        ...font,
        fontSize: 14,
        lineHeight: 20,
        color: colors.ink,
        minHeight: filled ? 56 : 48,
        paddingHorizontal: 14,
        paddingVertical: filled ? 12 : 13,
        borderRadius: filled ? 14 : 0,
        backgroundColor: filled ? colors.field : 'transparent',
      }}
    />
  );
}
