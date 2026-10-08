import { requireOptionalNativeModule } from 'expo';
import { Linking } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

/**
 * expo-notifications, or null on a development build installed before it was added (the native
 * module is missing until `expo run:ios|android` / an EAS build): importing it there would crash.
 */
function notifications(): NotificationsModule | null {
  if (!requireOptionalNativeModule('ExpoNotificationPermissionsModule')) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as NotificationsModule;
}

export type NotificationPermission = {
  /** The OS lets the app show notifications. */
  granted: boolean;
  /** The app may still show the system prompt (false once the user has refused it). */
  canAskAgain: boolean;
  /** False on a build without the native module: the permission cannot be read. */
  available: boolean;
};

const unavailable: NotificationPermission = { granted: false, canAskAgain: false, available: false };

export async function getNotificationPermission(): Promise<NotificationPermission> {
  const module = notifications();
  if (!module) return unavailable;
  const { granted, canAskAgain } = await module.getPermissionsAsync();
  return { granted, canAskAgain, available: true };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const module = notifications();
  if (!module) return unavailable;
  const { granted, canAskAgain } = await module.requestPermissionsAsync();
  return { granted, canAskAgain, available: true };
}

/** The app's page in the system Settings, where a refused permission can be turned back on. */
export const openNotificationSettings = () => Linking.openSettings();
