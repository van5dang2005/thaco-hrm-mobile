import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, type ReactNode, type Ref } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewProps } from 'react-native';
import Animated, { SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

/** Translucent white for controls on the blue header (pills, stats, segmented, unselected days). */
export const onBlue = (alpha: number) => `rgba(255, 255, 255, ${alpha})`;

/** Text colors on the blue header: `fg` titles, `sub` secondary (#D4E3F2), `muted` tertiary (#A9C6E4). */
export function useHeaderColors() {
  const { colors } = useTheme();
  return { bg: colors.header, fg: colors['header-name'], sub: colors['header-job'], muted: colors['header-dept'] };
}

/** Light status bar while a blue-header screen is focused. */
export function useLightStatusBar() {
  const { scheme } = useTheme();
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(scheme === 'dark' ? 'light' : 'dark');
    }, [scheme]),
  );
}

/** Horizontal / vertical padding and gap of the sheet content (design: 18/16, blocks 12 apart). */
export const SHEET_PADDING = { horizontal: 16, top: 18, bottom: 24, gap: 12 } as const;

type Props = {
  /** Content of the blue header: a `HeaderBar` plus pills, stats, segmented… */
  header: ReactNode;
  children: ReactNode;
  /** Sticky actions at the bottom of the sheet, laid out in a row 10 apart. */
  footer?: ReactNode;
  /** Shown above the footer row (error banner, hint). */
  footerNote?: ReactNode;
  /** `sheet` = #F5F7FA list background (default); `surface` = white (login, wizard forms). */
  sheetBg?: 'sheet' | 'surface';
  /**
   * Wrap children in a ScrollView with the standard padding and gap (default). Pass `false` when the
   * screen renders its own FlatList / SectionList, which should then use `SHEET_PADDING`.
   */
  scroll?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  scrollRef?: Ref<ScrollView>;
  /** Content between the header and the sheet, on the blue background (booking ticket). */
  between?: ReactNode;
  /** Slide the sheet in from the right (wizard steps; the header stays put). */
  slide?: boolean;
  /** Extra space under the header content before the sheet (default 20). */
  headerBottom?: number;
  /** Floating content over the sheet (selection bars). Rendered after the scroll content. */
  overlay?: ReactNode;
  testID?: string;
};

/**
 * One screen of the unified design: blue page, header content under the safe area, then a sheet with
 * 28pt top corners that holds the scrolling content and an optional sticky footer.
 */
export function ScreenShell({
  header,
  children,
  footer,
  footerNote,
  sheetBg = 'sheet',
  scroll = true,
  refreshControl,
  scrollRef,
  between,
  slide,
  headerBottom = 20,
  overlay,
  testID,
}: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  useLightStatusBar();
  const background = sheetBg === 'surface' ? colors.surface : colors.canvas;

  return (
    <KeyboardAvoidingView
      testID={testID}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      style={{ backgroundColor: colors.header }}
    >
      <View style={{ paddingTop: insets.top, paddingHorizontal: 12, paddingBottom: headerBottom }}>{header}</View>
      {between}
      <Animated.View
        entering={slide ? SlideInRight.duration(220) : undefined}
        className={cn('flex-1 overflow-hidden rounded-t-sheet', scheme === 'dark' && 'border-x border-t border-line')}
        style={{ backgroundColor: background }}
      >
        <View className="flex-1">
          {scroll ? (
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              refreshControl={refreshControl}
              contentContainerStyle={{
                paddingHorizontal: SHEET_PADDING.horizontal,
                paddingTop: SHEET_PADDING.top,
                paddingBottom: SHEET_PADDING.bottom,
                gap: SHEET_PADDING.gap,
              }}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
          {overlay}
        </View>
        {footer ? (
          <View className="gap-2.5 border-t border-line-2 bg-surface px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
            {footerNote}
            <View className="flex-row items-center gap-2.5">{footer}</View>
          </View>
        ) : null}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
