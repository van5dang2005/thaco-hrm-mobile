import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { ServiceId } from '@/core/api/ApiError';
import { apiFor, services } from '@/core/api/clients';
import { env } from '@/core/config/env';
import { useSessionStore } from '@/core/session/sessionStore';
import { kv, kvKeys } from '@/core/storage/kv';

import { notifications } from './permission';

/** Android channel every push lands in; the back-ends send `channelId: "default"` (or nothing). */
export const androidChannelId = 'default';

/**
 * Body of `POST /api/push-tokens` and `POST /api/push-tokens/unregister` on each back-end (see PUSH_NOTIFICATIONS.md).
 * Registering is an upsert keyed on `token`: the same phone signing in with another account moves the token.
 */
type PushTokenBody = { token: string; platform: 'ios' | 'android'; deviceName: string | null; appVersion: string };

function connectedServices(): ServiceId[] {
  const { connected } = useSessionStore.getState();
  return services.filter((service) => connected[service]);
}

/**
 * The Expo push token of this install, or null when it cannot get one: no permission, a simulator, a build
 * without the native module, or Android without FCM credentials (google-services.json).
 */
async function getPushToken(): Promise<string | null> {
  const n = notifications();
  if (!n || !Device.isDevice) return null;
  const { granted } = await n.getPermissionsAsync();
  if (!granted) return null;
  if (Platform.OS === 'android') {
    await n.setNotificationChannelAsync(androidChannelId, { name: 'THACO ONE', importance: n.AndroidImportance.HIGH });
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  try {
    return (await n.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

/**
 * Sends this install's push token to every back-end the account uses. Safe to call often (launch, sign-in,
 * permission granted): each call is an upsert. A back-end without the endpoint yet (404) is ignored.
 */
export async function registerPushToken(): Promise<void> {
  const token = await getPushToken();
  if (!token) return;
  const body: PushTokenBody = { token, platform: Platform.OS === 'ios' ? 'ios' : 'android', deviceName: Device.deviceName, appVersion: env.appVersion };
  await Promise.allSettled(connectedServices().map((service) => apiFor(service).post('/api/push-tokens', body)));
  kv.set(kvKeys.pushToken, token);
}

/**
 * Withdraws the token before the session ends (it still needs the access token), so this phone stops
 * receiving the account's notifications. Gives up after a few seconds rather than hold up sign-out.
 */
export async function unregisterPushToken(): Promise<void> {
  const token = kv.getString(kvKeys.pushToken);
  if (!token) return;
  kv.remove(kvKeys.pushToken);
  const requests = Promise.allSettled(connectedServices().map((service) => apiFor(service).post('/api/push-tokens/unregister', { token })));
  await Promise.race([requests, new Promise((resolve) => setTimeout(resolve, 3000))]);
}
