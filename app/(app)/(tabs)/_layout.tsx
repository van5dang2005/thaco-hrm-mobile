import { Tabs } from 'expo-router/tabs';

import { AppTabBar } from '@/features/home';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="parcels" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
