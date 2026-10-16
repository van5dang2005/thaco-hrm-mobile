import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { onBlue, useHeaderColors } from './ScreenShell';
import { Text } from './Text';

export type HeaderTabOption<T extends string> = {
  value: T;
  label: string;
  /** Count pill after the label; hidden while undefined (loading). */
  count?: number;
  /** Red count pill: this tab holds work waiting for the user. */
  attention?: boolean;
  testID?: string;
};

type Props<T extends string> = {
  options: HeaderTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  testID?: string;
};

type Span = { x: number; width: number };

const TIMING = { duration: 240, easing: Easing.out(Easing.cubic) };

/**
 * Underlined tabs at the bottom edge of the blue header (pass the ModuleHeader `bottom={0}`): equal
 * columns across the full width over a faint hairline, white bold label for the selected tab, and a
 * 3pt white bar that slides and resizes to sit under the selected label and its count.
 */
export function HeaderTabs<T extends string>({ options, value, onChange, className, testID }: Props<T>) {
  const { fg } = useHeaderColors();
  // Where each tab's label + count sits in the row, so the bar can match it.
  const [tabX, setTabX] = useState<Partial<Record<T, number>>>({});
  const [content, setContent] = useState<Partial<Record<T, Span>>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const placed = useRef(false);

  const left = tabX[value];
  const span = content[value];
  useEffect(() => {
    if (left === undefined || !span) return;
    const to = { x: left + span.x, width: span.width };
    // The first layout places the bar; later tab changes slide it.
    x.set(placed.current ? withTiming(to.x, TIMING) : to.x);
    width.set(placed.current ? withTiming(to.width, TIMING) : to.width);
    placed.current = true;
  }, [left, span, x, width]);

  const bar = useAnimatedStyle(() => ({ width: width.get(), transform: [{ translateX: x.get() }] }));

  return (
    // Full bleed: cancel the header's 16pt side padding so the hairline runs edge to edge.
    <View testID={testID} accessibilityRole="tablist" className={cn('-mx-4 flex-row px-1', className)}>
      <View pointerEvents="none" className="absolute bottom-0 left-0 right-0" style={{ height: 1, backgroundColor: onBlue(0.14) }} />
      {options.map((option) => (
        <Tab
          key={option.value}
          option={option}
          active={option.value === value}
          onTabLayout={(tx) => setTabX((prev) => (prev[option.value] === tx ? prev : { ...prev, [option.value]: tx }))}
          onContentLayout={(s) => setContent((prev) => (prev[option.value]?.x === s.x && prev[option.value]?.width === s.width ? prev : { ...prev, [option.value]: s }))}
          onPress={() => {
            if (option.value === value) return;
            void Haptics.selectionAsync();
            onChange(option.value);
          }}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', bottom: 0, left: 0, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: fg }, bar]}
      />
    </View>
  );
}

type TabProps<T extends string> = {
  option: HeaderTabOption<T>;
  active: boolean;
  onTabLayout: (x: number) => void;
  onContentLayout: (span: Span) => void;
  onPress: () => void;
};

function Tab<T extends string>({ option, active, onTabLayout, onContentLayout, onPress }: TabProps<T>) {
  const { fg } = useHeaderColors();
  return (
    <Pressable
      testID={option.testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={option.count === undefined ? option.label : `${option.label}, ${option.count}`}
      onPress={onPress}
      onLayout={(e) => onTabLayout(e.nativeEvent.layout.x)}
      className="h-12 min-w-0 flex-1 items-center justify-center px-1.5 active:opacity-70"
    >
      <View className="min-w-0 max-w-full flex-row items-center gap-1.5" onLayout={(e) => onContentLayout({ x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })}>
        <Text
          weight={active ? 'bold' : 'semibold'}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={1.25}
          className="flex-shrink"
          style={{ fontSize: 14, lineHeight: 18, color: active ? fg : onBlue(0.7) }}
        >
          {option.label}
        </Text>
        {option.count !== undefined ? <CountPill count={option.count} active={active} attention={!!option.attention && option.count > 0} /> : null}
      </View>
    </Pressable>
  );
}

function CountPill({ count, active, attention }: { count: number; active: boolean; attention: boolean }) {
  const { colors } = useTheme();
  const { fg } = useHeaderColors();
  const bg = attention ? colors.danger : active ? fg : onBlue(0.16);
  const text = attention ? '#FFFFFF' : active ? colors.header : onBlue(0.85);
  return (
    <View className="h-[18px] min-w-[20px] items-center justify-center rounded-full px-1.5" style={{ backgroundColor: bg }}>
      <Text weight="bold" numeric maxFontSizeMultiplier={1} style={{ fontSize: 11.5, lineHeight: 14, color: text }}>
        {count > 99 ? '99+' : String(count)}
      </Text>
    </View>
  );
}
