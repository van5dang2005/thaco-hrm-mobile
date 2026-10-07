import { Stack } from 'expo-router';

/**
 * Booking wizard: index (B1 room) → time (B2) → details (B3) → confirm (B4). State lives in
 * useBookingDraft. Steps cross-fade so the blue header looks fixed; each white sheet slides in.
 */
export default function BookingWizardLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />;
}
