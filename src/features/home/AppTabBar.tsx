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
import { type AppIcon, CalendarSyncIcon, UserRoundCogIcon, HouseHeartIcon, SignatureIcon } from '@/shared/ui/icons';
import { shadows } from '@/shared/ui/shadows';
import { Text } from '@/shared/ui/Text';

type TabName = 'index' | 'approvals' | 'calendar' | 'profile';

const tabIcon: Record<TabName, AppIcon> = {
  index: HouseHeartIcon,
  approvals: SignatureIcon,
  calendar: CalendarSyncIcon,
  profile: UserRoundCogIcon,
};

const tabLabel = {
  index: 'tabs.home',
  approvals: 'tabs.approvals',
  calendar: 'tabs.calendar',
  profile: 'tabs.profile',
} as const;

/** Page color behind the bar, so it floats on the screen it belongs to: home #F2F4F8, the others #EDF1F6. */
const pageColor: Record<TabName, 'home-bg' | 'canvas'> = {
  index: 'home-bg',
  approvals: 'canvas',
  calendar: 'canvas',
  profile: 'canvas',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const MOTION = LinearTransition.duration(220);

/**
 * Floating tab bar (design 2c): a white pill (radius 32, soft shadow) 16pt from the edges. The active
 * tab is a primary pill with icon and label, the others are icons only. "Duyệt" carries the
 * pending-approval count.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const pending = useApprovalStats().data?.pendingApprovalsForUser ?? 0;
  const background = colors[pageColor[state.routes[state.index].name as TabName] ?? 'canvas'];

  return (
    <View className="px-4" style={{ backgroundColor: background, paddingTop: 6, paddingBottom: Math.max(insets.bottom - 6, 12) }}>
      <View
        accessibilityRole="tablist"
        className="h-16 flex-row items-center rounded-[32px] bg-elevated p-2"
        style={[shadows.card, scheme === 'dark' ? { borderWidth: 1, borderColor: colors.line } : null]}
      >
        {state.routes.map((route, index) => {
          const name = route.name as TabName;
          const focused = state.index === index;
          const label = t(tabLabel[name]);
          const badge = name === 'approvals' ? pending : 0;
          const color = focused ? colors['on-primary'] : colors['ink-2'];

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
                <Icon icon={tabIcon[name]} size={21} rawColor={color} weight={focused ? 'bold' : 'regular'} />
                {badge ? <CountBadge count={badge} ring={focused ? 'primary' : 'elevated'} className="absolute" style={{ left: 11, top: -8 }} /> : null}
              </View>
              {focused ? (
                <Animated.View entering={FadeIn.duration(180).delay(60)} className="flex-shrink">
                  <Text weight="bold" numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ fontSize: 13.5, lineHeight: 18, color }}>
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
