import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { services } from '@/core/api/clients';
import { qk } from '@/core/query/keys';
import { refreshMyApps } from '@/core/session/session';
import { useSessionStore } from '@/core/session/sessionStore';
import { useTheme } from '@/core/theme/ThemeProvider';
import { useTotalUnread } from '@/features/notification/api';
import { images, WORDMARK_RATIO } from '@/shared/assets';
import { CountBadge } from '@/shared/ui/CountBadge';
import { Icon } from '@/shared/ui/Icon';
import { type AppIcon, BellIcon, LayoutGridIcon } from '@/shared/ui/icons';
import { shadows } from '@/shared/ui/shadows';
import { EmptyState } from '@/shared/ui/StateViews';

import { HeroCard } from './HeroCard';
import { HomeLayoutSheet } from './HomeLayoutSheet';
import { CardLayout } from './layouts/CardLayout';
import { GridLayout } from './layouts/GridLayout';
import { GroupedLayout } from './layouts/GroupedLayout';
import type { LayoutProps } from './layouts/shared';
import { ModuleOrderSheet } from './ModuleOrderSheet';
import { type HomeLayout, useEffectiveHomePrefs } from './prefs';
import { useHomeModules, useModuleSignals, useOpenModule } from './useModules';

const layoutComponents: Record<HomeLayout, ComponentType<LayoutProps>> = {
  grid: GridLayout,
  grouped: GroupedLayout,
  cards: CardLayout,
};

const FADE_MS = 200;

/** Query groups behind the profile, badges and summaries (pull-to-refresh, with the granted apps). */
const refreshKeys = [...services.map((service) => qk.me(service)), qk.notifications.root, qk.approvals.root, qk.bookings.root, qk.rooms.root, qk.parcels.root];

/** Home (2c / 2f / 2g): wordmark pill + bell + layout button, the blue greeting card, then the chosen layout. */
export function HomeScreen() {
  const { t } = useTranslation();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const unread = useTotalUnread();
  const appsKnown = useSessionStore((s) => s.apps !== null);
  const modules = useHomeModules();
  const signals = useModuleSignals();
  const open = useOpenModule();
  const { layout, showTodo, showNextMeeting } = useEffectiveHomePrefs();
  const [layoutSheet, setLayoutSheet] = useState(false);
  const [orderSheet, setOrderSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const dark = scheme === 'dark';
  const bookRoom = modules.find((m) => m.id === 'book-room');
  const roomVisible = modules.some((m) => m.permission?.service === 'room');

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(dark ? 'light' : 'dark');
    }, [dark]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshMyApps(), ...refreshKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))]);
    setRefreshing(false);
  };

  const Layout = layoutComponents[layout];

  return (
    <View className="flex-1" style={{ backgroundColor: colors['home-bg'] }}>
      <View className="flex-row items-center justify-between px-5 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <View accessibilityRole="header" accessibilityLabel="THACO" className="h-[34px] justify-center rounded-full bg-header px-3.5">
          <Image source={images.wordmark} style={{ height: 14, width: 14 * WORDMARK_RATIO }} contentFit="contain" accessibilityIgnoresInvertColors />
        </View>
        <View className="flex-row gap-2.5">
          <RoundButton
            testID="home-bell"
            icon={BellIcon}
            label={unread ? `${t('home.notifications')}, ${unread}` : t('home.notifications')}
            badge={unread}
            onPress={() => router.push('/notifications')}
          />
          <RoundButton testID="home-layout" icon={LayoutGridIcon} label={t('home.layoutSheet.title')} onPress={() => setLayoutSheet(true)} />
        </View>
      </View>

      <ScrollView
        testID="home-scroll"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.muted} colors={[colors.primary]} />}
      >
        <HeroCard showNextMeeting={showNextMeeting && roomVisible} onBook={bookRoom ? () => open(bookRoom) : undefined} />
        {modules.length ? (
          <Animated.View key={layout} entering={FadeIn.duration(FADE_MS)}>
            <Layout modules={modules} signals={signals} onOpen={open} showTodo={showTodo} onCustomize={() => setOrderSheet(true)} />
          </Animated.View>
        ) : (
          // Tiles come from the apps the portal grants: none granted, or the list could not be read.
          <EmptyState testID="home-no-modules" icon={LayoutGridIcon} message={t(appsKnown ? 'home.noModules' : 'home.appsUnavailable')} />
        )}
      </ScrollView>

      <HomeLayoutSheet visible={layoutSheet} onClose={() => setLayoutSheet(false)} onSort={() => setOrderSheet(true)} />
      <ModuleOrderSheet visible={orderSheet} onClose={() => setOrderSheet(false)} />
    </View>
  );
}

/** 42pt white round button with a soft shadow and an optional red count (home toolbar). */
function RoundButton({ icon, label, badge, onPress, testID }: { icon: AppIcon; label: string; badge?: number; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-[42px] w-[42px] items-center justify-center rounded-full bg-elevated active:opacity-70"
      style={shadows.soft}
    >
      <Icon icon={icon} size={20} color="ink" />
      {badge ? <CountBadge count={badge} ring="home-bg" className="absolute -right-1 -top-1" /> : null}
    </Pressable>
  );
}
