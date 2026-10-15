import { requireOptionalNativeModule } from 'expo';

export type CameraModule = typeof import('expo-camera');

/**
 * expo-camera, or null on a build installed before it was added (the native module is missing until
 * `expo run:ios|android` / an EAS build, an OTA update cannot bring it): importing it there would crash.
 */
export function camera(): CameraModule | null {
  if (!requireOptionalNativeModule('ExpoCamera')) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-camera') as CameraModule;
}
