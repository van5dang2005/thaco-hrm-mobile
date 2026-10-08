import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * App config. Env values live on expo.dev (EAS environment variables): `npm run env:pull*` writes
 * them to the single local `.env`, which Expo CLI loads before evaluating this file. EAS builds read
 * the profile's environment directly; `eas.json` sets APP_ENV per profile.
 */
type AppEnv = 'development' | 'preview' | 'production';

const appEnv: AppEnv = (['development', 'preview', 'production'] as const).find((v) => v === process.env.APP_ENV) ?? 'development';

/** Non-production builds are labelled on the home screen so testers can tell them apart. */
const nameSuffix: Record<AppEnv, string> = { development: ' (Dev)', preview: ' (Beta)', production: '' };

const cameraPermission = 'THACO HRM dùng camera để chụp ảnh bưu phẩm khi tiếp nhận.';
const photosPermission = 'THACO HRM cần truy cập thư viện ảnh để đính kèm ảnh bưu phẩm.';
const faceIdPermission = 'THACO HRM dùng Face ID để đăng nhập nhanh.';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: `${nameSuffix[appEnv]} THACO HRM`,
  slug: 'thaco-hrm-mobile',
  owner: 'nguyenvandang',
  version: '2.4.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'thacohrm',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'vn.com.thaco.hrm',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: cameraPermission,
      NSPhotoLibraryUsageDescription: photosPermission,
      NSFaceIDUsageDescription: faceIdPermission,
      LSApplicationQueriesSchemes: ['thacopaytime'],
    },
  },
  android: {
    package: 'vn.com.thaco.hrm',
    adaptiveIcon: {
      backgroundColor: '#00539B',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['android.permission.CAMERA', 'android.permission.USE_BIOMETRIC', 'android.permission.RECORD_AUDIO', 'android.permission.USE_FINGERPRINT'],
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#00539B',
        image: './assets/images/splash-icon.png',
        imageWidth: 180,
        dark: { backgroundColor: '#0B1420', image: './assets/images/splash-icon.png' },
      },
    ],
    'expo-secure-store',
    'expo-sharing',
    ['expo-image-picker', { cameraPermission, photosPermission }],
    ['expo-local-authentication', { faceIDPermission: faceIdPermission }],
    'expo-notifications',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appEnv,
    router: {},
    eas: { projectId: '044157d9-6fbf-4d99-aa5b-c2318a1cb638' },
  },
});
