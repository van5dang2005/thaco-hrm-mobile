import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { HeaderBar } from '@/shared/ui/HeaderBar';
import { HourglassMediumIcon } from '@/shared/ui/icons';
import { ScreenShell } from '@/shared/ui/ScreenShell';
import { EmptyState } from '@/shared/ui/StateViews';

/** Landing for modules shown on the home grid but not served by these back-ends yet. */
export function ComingSoonScreen({ title }: { title?: string }) {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ module?: string }>();
  const moduleName = title ?? params.module ?? t('comingSoon.title');
  return (
    <ScreenShell header={<HeaderBar title={moduleName} />}>
      <EmptyState
        icon={HourglassMediumIcon}
        message={t('comingSoon.message', { module: moduleName })}
        actionLabel={t('comingSoon.back')}
        onAction={() => router.dismissTo('/')}
      />
    </ScreenShell>
  );
}
