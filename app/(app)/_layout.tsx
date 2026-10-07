import { Stack } from 'expo-router';

import { RealtimeProvider } from '@/core/realtime/RealtimeProvider';

export default function AppLayout() {
  return (
    <>
      <RealtimeProvider />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
