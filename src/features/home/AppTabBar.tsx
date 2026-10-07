import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme/ThemeProvider';
import { useApprovalStats } from '@/features/approval/hooks';
import { CountBadge } from '@/shared/ui/CountBadge';
import { Icon } from '@/shared/ui/Icon';
import { CalendarModernIcon } from '@/shared/ui/customIcons';
import { type AppIcon, HouseIcon, SealCheckIcon, UserIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

type TabName = 'index' | 'approvals' | 'calendar' | 'profile';

const tabIcon: Record<TabName, AppIcon> = {
  index: HouseIcon,
  approvals: SealCheckIcon,
  calendar: CalendarModernIcon,
  profile: UserIcon,
};

const tabLabel = {
  index: 'tabs.home',
  approvals: 'tabs.approvals',
  calendar: 'tabs.calendar',
  profile: 'tabs.profile',
} as const;

/** Bottom color of each tab's sheet, so the strip behind the bar continues the screen: home is white, the others #F5F7FA. */
const sheetBottom: Record<TabName, 'surface' | 'canvas'> = {
  index: 'surface',
  approvals: 'canvas',
  calendar: 'canvas',
  profile: 'canvas',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const MOTION = LinearTransition.duration(220);

/**
 * Pill tab bar: a rounded track with the active tab as a primary pill (icon + label) and the others
 * as icons only. "Duyệt" carries the pending-approval count.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pending = useApprovalStats().data?.pendingApprovalsForUser ?? 0;
  const background = colors[sheetBottom[state.routes[state.index].name as TabName]];

  return (
    <View className="px-4" style={{ backgroundColor: background, paddingTop: 8, paddingBottom: Math.max(insets.bottom - 8, 12) }}>
      <View accessibilityRole="tablist" className="h-14 flex-row items-center rounded-full bg-tabbar p-1.5">
        {state.routes.map((route, index) => {
          const name = route.name as TabName;
          const focused = state.index === index;
          const label = t(tabLabel[name]);
          const badge = name === 'approvals' ? pending : 0;
          const color = focused ? colors['on-primary'] : colors['tabbar-icon'];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              void Haptics.selectionAsync();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <AnimatedPressable
              key={route.key}
              layout={MOTION}
              testID={`tab-${name}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${label}, ${badge}` : label}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              // The active tab takes two shares of the width and every other tab one, so icons stay evenly spaced.
              style={{ flex: focused ? 2 : 1 }}
              className={focused ? 'h-full flex-row items-center justify-center gap-2 rounded-full bg-primary px-3' : 'h-full items-center justify-center active:opacity-60'}
            >
              <View>
                <Icon icon={tabIcon[name]} size={22} rawColor={color} weight={focused ? 'fill' : 'regular'} />
                {badge ? (
                  <CountBadge count={badge} className="absolute" style={{ left: 12, top: -8 }} ring={focused ? 'primary' : 'tabbar'} />
                ) : null}
              </View>
              {focused ? (
                <Animated.View entering={FadeIn.duration(180).delay(60)} className="flex-shrink">
                  <Text weight="semibold" numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: 13.5, lineHeight: 18, color }}>
                    {label}
                  </Text>
                </Animated.View>
              ) : null}
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}
