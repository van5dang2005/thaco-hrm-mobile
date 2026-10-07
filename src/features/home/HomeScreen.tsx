import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { qk } from '@/core/query/keys';
import { useProfile } from '@/core/session/useMe';
import { useTheme } from '@/core/theme/ThemeProvider';
import { useTotalUnread } from '@/features/notification/api';
import { cn } from '@/shared/lib/cn';
import { initialsOf } from '@/shared/ui/Avatar';
import { CountBadge } from '@/shared/ui/CountBadge';
import { Icon } from '@/shared/ui/Icon';
import { HeaderBar, HeaderIconButton } from '@/shared/ui/HeaderBar';
import { BellIcon, ListIcon, SquaresFourIcon } from '@/shared/ui/icons';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

import { AllModulesDrawer } from './AllModulesDrawer';
import { HomeLayoutSheet } from './HomeLayoutSheet';
import { CardLayout } from './layouts/CardLayout';
import { GridLayout } from './layouts/GridLayout';
import { GroupedLayout } from './layouts/GroupedLayout';
import type { LayoutProps } from './layouts/shared';
import { type HomeLayout, useEffectiveHomePrefs } from './prefs';
import { useGreeting } from './useGreeting';
import { TodayCard } from './TodayCard';
import { useHomeModules, useModuleSignals, useOpenModule } from './useModules';

const layoutComponents: Record<HomeLayout, ComponentType<LayoutProps>> = {
  grid: GridLayout,
  grouped: GroupedLayout,
  cards: CardLayout,
};

const FADE_MS = 200;

/** Query groups behind the profile, badges and summaries (pull-to-refresh). */
const refreshKeys = [qk.me('parcel'), qk.me('room'), qk.notifications.root, qk.approvals.root, qk.bookings.root, qk.rooms.root, qk.parcels.root, qk.delegations.root];

/** Home (2c / 2f / 2g): toolbar, optional profile block, then a white sheet with today's card and the utilities. */
export function HomeScreen() {
  const { t } = useTranslation();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const unread = useTotalUnread();
  const modules = useHomeModules();
  const signals = useModuleSignals();
  const open = useOpenModule();
  const { layout, showProfile } = useEffectiveHomePrefs();
  const [layoutSheet, setLayoutSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const dark = scheme === 'dark';

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(dark ? 'light' : 'dark');
    }, [dark]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all(refreshKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    setRefreshing(false);
  };

  const Layout = layoutComponents[layout];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.header }}>
      <View style={{ paddingTop: insets.top }} className="px-3">
        <HeaderBar
          logo
          left={<HeaderIconButton testID="home-menu" variant="plain" icon={ListIcon} label={t('home.allModules')} onPress={() => setMenu(true)} />}
          right={
            <>
              <HeaderIconButton
                testID="home-bell"
                icon={BellIcon}
                label={unread ? `${t('home.notifications')}, ${unread}` : t('home.notifications')}
                onPress={() => router.push('/notifications')}
              >
                {/* Pinned to the circle's top-right corner and grows leftwards; the header-colored ring cuts it out of the circle. */}
                <CountBadge count={unread} className="absolute" style={{ right: -6, top: -6 }} ring="header" />
              </HeaderIconButton>
              <HeaderIconButton testID="home-layout" icon={SquaresFourIcon} label={t('home.layoutSheet.title')} onPress={() => setLayoutSheet(true)} />
            </>
          }
        />
        {showProfile ? (
          <Animated.View entering={FadeIn.duration(FADE_MS)}>
            <ProfileBlock />
          </Animated.View>
        ) : null}
      </View>

      <Animated.View
        layout={LinearTransition.duration(FADE_MS)}
        className={cn('flex-1 overflow-hidden rounded-t-[28px] bg-surface', dark && 'border-x border-t border-line')}
        style={{ marginTop: showProfile ? 20 : 8 }}
      >
        <ScrollView
          testID="home-scroll"
          contentContainerStyle={{ paddingBottom: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.muted} colors={[colors.primary]} />}
        >
          <TodayCard modules={modules} signals={signals} onOpen={open} />
          <Text weight="bold" accessibilityRole="header" className="mx-5 mt-6 text-head text-ink">
            {t('home.utilities')}
          </Text>
          <Animated.View key={layout} entering={FadeIn.duration(FADE_MS)}>
            <Layout modules={modules} signals={signals} onOpen={open} />
          </Animated.View>
        </ScrollView>
      </Animated.View>

      <AllModulesDrawer visible={menu} onClose={() => setMenu(false)} modules={modules} signals={signals} onOpen={open} />
      <HomeLayoutSheet visible={layoutSheet} onClose={() => setLayoutSheet(false)} />
    </View>
  );
}

/** Left-aligned identity on the blue header: avatar, time-of-day greeting, name, job title and unit. */
function ProfileBlock() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfile();
  const greeting = useGreeting();
  const unit = [profile.departmentName, profile.unitName].filter(Boolean).join(' · ');

  return (
    <View testID="home-profile" className="flex-row items-center gap-3.5 px-2 pt-3">
      <View className="h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full border-2 border-white/90 bg-primary-tint-2">
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={{ width: 56, height: 56 }} contentFit="cover" transition={120} accessibilityIgnoresInvertColors />
        ) : (
          <Text weight="semibold" className="text-primary-tint-text" style={{ fontSize: 20, lineHeight: 25 }}>
            {initialsOf(profile.fullname)}
          </Text>
        )}
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Icon icon={greeting.icon} size={14} weight="bold" rawColor={greeting.key === 'evening' ? colors['header-sub'] : colors['header-warn-text']} />
          <Text numberOfLines={1} className="text-sub" style={{ color: colors['header-job'] }}>
            {t(`home.greeting.${greeting.key}`)}
          </Text>
        </View>
        {profile.isLoading && !profile.fullname ? (
          <View className="mt-1.5 gap-1.5">
            <Skeleton width={170} height={18} />
            <Skeleton width={130} height={11} />
          </View>
        ) : (
          <>
            <Text
              weight="bold"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              accessibilityRole="header"
              style={{ fontSize: 21, lineHeight: 27, letterSpacing: -0.3, color: colors['header-name'] }}
            >
              {profile.fullname ?? '—'}
            </Text>
            {profile.jobTitleName ? (
              <Text numberOfLines={1} className="text-sub-sm" style={{ color: colors['header-job'] }}>
                {profile.jobTitleName}
              </Text>
            ) : null}
            {unit ? (
              <Text numberOfLines={1} className="text-meta" style={{ color: colors['header-dept'] }}>
                {unit}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
