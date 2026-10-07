import { Redirect } from 'expo-router';

import { UiGalleryScreen } from '@/features/dev/UiGalleryScreen';

/** Developer gallery for the design system (`/ui`). Not reachable in release builds. */
export default function UiGalleryRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <UiGalleryScreen />;
}
