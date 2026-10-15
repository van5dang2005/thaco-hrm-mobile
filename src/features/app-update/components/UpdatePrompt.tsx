import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, View } from 'react-native';

import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { CloudDownloadIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

/** Look for a new OTA patch again when the app comes back to the foreground, at most this often. */
const RECHECK_MS = 10 * 60 * 1000;

/**
 * Asks the user to install an OTA patch (`npm run update:production`) as soon as one is found: the
 * launch check (expo-updates `checkAutomatically: ON_LOAD`) or a recheck when the app returns to the
 * foreground. "Cập nhật" downloads it if needed and restarts the JS; "Để sau" hides it for this session,
 * and a patch already downloaded applies by itself on the next cold start.
 */
export function UpdatePrompt() {
  // Off in development and Expo Go: there is no update channel to read.
  if (!Updates.isEnabled) return null;
  return <UpdatePromptSheet />;
}

function UpdatePromptSheet() {
  const { t } = useTranslation();
  const { isUpdateAvailable, isUpdatePending, availableUpdate } = Updates.useUpdates();
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    let lastCheck = Date.now();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || Date.now() - lastCheck < RECHECK_MS) return;
      lastCheck = Date.now();
      Updates.checkForUpdateAsync().catch(() => undefined);
    });
    return () => sub.remove();
  }, []);

  const updateId = availableUpdate?.updateId ?? 'pending';
  const visible = (isUpdateAvailable || isUpdatePending) && dismissedId !== updateId;

  const install = async () => {
    setInstalling(true);
    try {
      if (!isUpdatePending) await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      setInstalling(false);
      toast.error(t('appUpdate.failed'));
    }
  };

  return (
    <BottomSheet
      testID="app-update-sheet"
      visible={visible}
      onClose={() => !installing && setDismissedId(updateId)}
      icon={CloudDownloadIcon}
      iconTone="brand"
      title={t('appUpdate.title')}
      subtitle={t('appUpdate.subtitle')}
      footer={
        <View className="flex-row gap-2.5">
          <Button testID="app-update-later" className="flex-1" variant="soft" size="lg" label={t('appUpdate.later')} disabled={installing} onPress={() => setDismissedId(updateId)} />
          <Button testID="app-update-install" className="flex-[1.4]" size="lg" label={t('appUpdate.install')} loading={installing} onPress={install} />
        </View>
      }
    >
      <Text className="text-muted" style={{ fontSize: 14, lineHeight: 20 }}>
        {t('appUpdate.body')}
      </Text>
    </BottomSheet>
  );
}
