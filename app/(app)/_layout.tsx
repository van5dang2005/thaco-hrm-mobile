import { Stack } from 'expo-router';

import { PushNotificationsProvider } from '@/core/notifications/PushNotificationsProvider';
import { RealtimeProvider } from '@/core/realtime/RealtimeProvider';

export default function AppLayout() {
  return (
    <>
      <RealtimeProvider />
      <PushNotificationsProvider />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
