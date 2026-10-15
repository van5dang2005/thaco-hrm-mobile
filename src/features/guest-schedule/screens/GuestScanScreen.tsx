import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/shared/ui/Button';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { Icon } from '@/shared/ui/Icon';
import { CameraIcon, FlashlightIcon, FlashlightOffIcon, ScanQrCodeIcon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { Text } from '@/shared/ui/Text';

import { camera, type CameraModule } from '../utils/camera';

const FRAME = 250;
const CORNER = 36;
const CORNER_WIDTH = 4;
/** Light blue that reads on any camera picture (the brand blue is too dark there). */
const SCAN_ACCENT = '#5AA9FF';
/** Panel under the camera. */
const PANEL = '#1B2430';

/**
 * "Quét mã QR" (guest check-in, step 1): the back camera under the blue header, a frame with a sweeping line,
 * the hint on a dark panel. A QR opens "Xác nhận vào cổng"; coming back here scans again.
 */
export function GuestScanScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [torch, setTorch] = useState(false);
  const cam = camera();

  return (
    <View testID="guest-scan-screen" className="flex-1" style={{ backgroundColor: PANEL }}>
      <ModuleHeader
        testID="guest-scan-header"
        title={t('guestSchedule.scan.title')}
        bottom={14}
        right={
          cam ? (
            <HeaderIconButton
              testID="guest-scan-torch"
              icon={torch ? FlashlightOffIcon : FlashlightIcon}
              label={t(torch ? 'guestSchedule.scan.torchOff' : 'guestSchedule.scan.torchOn')}
              onPress={() => setTorch((on) => !on)}
            />
          ) : null
        }
      />

      <View className="flex-1 overflow-hidden" style={{ backgroundColor: '#000000' }}>
        {cam ? <Scanner cam={cam} torch={torch} /> : <Blocked message={t('guestSchedule.scan.unsupported')} />}
      </View>

      <View className="flex-row items-center justify-center gap-3 px-8 pt-5" style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
        <Icon icon={ScanQrCodeIcon} size={26} rawColor="#FFFFFF" />
        <Text weight="medium" className="flex-shrink" style={{ color: '#FFFFFF', fontSize: 14, lineHeight: 20 }}>
          {t('guestSchedule.scan.hint')}
        </Text>
      </View>
    </View>
  );
}

/** Camera with the permission prompt. Runs only while the screen is focused, so a code is read once per visit. */
function Scanner({ cam, torch }: { cam: CameraModule; torch: boolean }) {
  const { t } = useTranslation();
  const [permission, requestPermission] = cam.useCameraPermissions();
  const [focused, setFocused] = useState(false);
  // The camera reports the same code many times a second, before navigation blurs the screen.
  const locked = useRef(false);

  useFocusEffect(
    useCallback(() => {
      locked.current = false;
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  if (!permission) return null;
  if (!permission.granted) {
    return permission.canAskAgain ? (
      <Blocked message={t('guestSchedule.scan.permission')} action={t('guestSchedule.scan.allowCamera')} onAction={() => void requestPermission()} />
    ) : (
      <Blocked message={t('guestSchedule.scan.permissionDenied')} action={t('profile.openSettings')} onAction={() => void Linking.openSettings()} />
    );
  }

  const onScanned = ({ data }: { data: string }) => {
    if (locked.current || !data.trim()) return;
    locked.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({ pathname: '/guests/check-in', params: { qr: data } });
  };

  return (
    <>
      {focused ? (
        <cam.CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
        />
      ) : null}
      <Viewfinder />
    </>
  );
}

/** Frame with four corner marks over a dimmed picture and a line sweeping top to bottom. */
function Viewfinder() {
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [sweep]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: 12 + sweep.get() * (FRAME - 24) }] }));
  const corner = { position: 'absolute' as const, width: CORNER, height: CORNER, borderColor: SCAN_ACCENT };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} className="items-center justify-center">
      <View style={{ width: FRAME, height: FRAME, borderRadius: 22, boxShadow: '0 0 0 2000px rgba(0, 0, 0, 0.45)' }}>
        <View style={[corner, { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 22 }]} />
        <View style={[corner, { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 22 }]} />
        <View style={[corner, { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 22 }]} />
        <View style={[corner, { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 22 }]} />
        <Animated.View
          style={[
            { position: 'absolute', left: -12, right: -12, top: 0, height: 2, borderRadius: 1, backgroundColor: SCAN_ACCENT, boxShadow: `0 0 10px 2px ${SCAN_ACCENT}` },
            lineStyle,
          ]}
        />
      </View>
    </View>
  );
}

/** No camera: no permission, or a build without the native module. */
function Blocked({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-5 px-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-white/10">
        <Icon icon={CameraIcon} size={28} rawColor="#FFFFFF" />
      </View>
      <Text className="text-center" style={{ color: '#FFFFFF', fontSize: 14.5, lineHeight: 21 }}>
        {message}
      </Text>
      {action && onAction ? <Button testID="guest-scan-permission" variant="inverse" size="lg" pill label={action} onPress={onAction} /> : null}
    </View>
  );
}
