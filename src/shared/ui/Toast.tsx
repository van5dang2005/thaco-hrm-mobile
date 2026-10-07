import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useTheme } from '@/core/theme/ThemeProvider';

import { Icon } from './Icon';
import { type AppIcon, BellIcon, CheckCircleIcon, InfoIcon, WarningCircleIcon } from './icons';
import { Text } from './Text';

type ToastTone = 'success' | 'error' | 'info' | 'notification';

type ToastItem = {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  onPress?: () => void;
  /** Button on the right (e.g. "Hoàn tác"); the toast stays a little longer. */
  action?: { label: string; onPress: () => void };
};

type ToastState = {
  current: ToastItem | null;
  show: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: () => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (toast) => set({ current: { ...toast, id: nextId++ } }),
  dismiss: () => set({ current: null }),
}));

/** Imperative helpers so mutations can report without prop drilling. */
export const toast = {
  success: (title: string, message?: string, action?: ToastItem['action']) => useToastStore.getState().show({ tone: 'success', title, message, action }),
  error: (title: string, message?: string) => useToastStore.getState().show({ tone: 'error', title, message }),
  info: (title: string, message?: string) => useToastStore.getState().show({ tone: 'info', title, message }),
  notification: (title: string, message?: string, onPress?: () => void) =>
    useToastStore.getState().show({ tone: 'notification', title, message, onPress }),
};

const toneIcon: Record<ToastTone, AppIcon> = {
  success: CheckCircleIcon,
  error: WarningCircleIcon,
  info: InfoIcon,
  notification: BellIcon,
};

export function ToastHost() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  useEffect(() => {
    if (!current) return undefined;
    const timer = setTimeout(dismiss, current.tone === 'error' || current.action ? 5500 : 3200);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;

  const iconColor =
    current.tone === 'success' ? colors['success-text'] : current.tone === 'error' ? colors.danger : colors['inverse-muted'];

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 8, zIndex: 1000 }}>
      <Animated.View key={current.id} entering={FadeInUp.duration(180)} exiting={FadeOutUp.duration(160)}>
        <Pressable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          onPress={() => {
            current.onPress?.();
            dismiss();
          }}
          className="mx-4 flex-row items-start gap-3 rounded-[16px] bg-inverse px-4 py-3"
          style={{ shadowColor: '#0F1B2D', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
        >
          <View className="pt-0.5">
            <Icon icon={toneIcon[current.tone]} size={18} weight="bold" rawColor={iconColor} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text weight="semibold" className="text-body text-on-inverse" numberOfLines={2}>
              {current.title}
            </Text>
            {current.message ? (
              <Text className="text-sub text-inverse-muted" numberOfLines={3}>
                {current.message}
              </Text>
            ) : null}
          </View>
          {current.action ? (
            <Pressable
              testID="toast-action"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                current.action?.onPress();
                dismiss();
              }}
              className="self-center active:opacity-70"
            >
              <Text weight="bold" numberOfLines={1} className="text-body text-on-inverse" style={{ textDecorationLine: 'underline' }}>
                {current.action.label}
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}
