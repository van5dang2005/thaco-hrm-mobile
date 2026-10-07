import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/core/theme/ThemeProvider';

import { Icon } from './Icon';
import { XIcon } from './icons';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Pinned under the title, above the scrolling body (search field). */
  header?: ReactNode;
  children: ReactNode;
  testID?: string;
};

const DURATION = 260;
const MAX_WIDTH = 340;
/** rgba(11, 20, 32, .55) behind the drawer, same as BottomSheet. */
const BACKDROP = '#0B1420';
const BACKDROP_OPACITY = 0.55;

/** Left drawer: slides in from the left over a dimmed backdrop, 28pt right radius; swipe left or tap outside to close. */
export function SideDrawer({ visible, onClose, title, header, children, testID }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth * 0.86, MAX_WIDTH);
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  // Keep the Modal mounted until the exit animation has finished.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.set(withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) }));
    } else if (mounted) {
      progress.set(
        withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, mounted, progress]);

  // Drag the panel left: past a third of its width (or a quick fling) it closes, otherwise it snaps back.
  const swipe = Gesture.Pan()
    .activeOffsetX(-12)
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      progress.set(Math.min(1, Math.max(0, 1 + e.translationX / width)));
    })
    .onEnd((e) => {
      if (e.translationX < -width / 3 || e.velocityX < -600) {
        scheduleOnRN(onClose);
      } else {
        progress.set(withTiming(1, { duration: 160 }));
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() * BACKDROP_OPACITY }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (progress.get() - 1) * width }] }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {/* A Modal is its own native root, so gestures inside it need their own root view. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BACKDROP }, backdropStyle]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <GestureDetector gesture={swipe}>
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width,
                backgroundColor: colors.surface,
                borderTopRightRadius: 28,
                borderBottomRightRadius: 28,
                paddingTop: insets.top + 8,
                paddingBottom: Math.max(insets.bottom, 16),
              },
              panelStyle,
            ]}
          >
            <View className="px-4" style={{ gap: 14 }}>
              <View className="min-h-11 flex-row items-center gap-3">
                <Text weight="bold" numberOfLines={1} accessibilityRole="header" className="flex-1 text-sheet">
                  {title ?? ''}
                </Text>
                <Pressable
                  testID={testID ? `${testID}-close` : undefined}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={onClose}
                  hitSlop={6}
                  className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
                  style={{ backgroundColor: colors.field }}
                >
                  <Icon icon={XIcon} size={16} weight="bold" color="muted" />
                </Pressable>
              </View>
              {header}
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}
