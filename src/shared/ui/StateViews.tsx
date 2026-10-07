import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useErrorMessage } from '@/core/errors/useErrorMessage';
import { cn } from '@/shared/lib/cn';

import { Button } from './Button';
import { Icon } from './Icon';
import { type AppIcon, WarningCircleIcon } from './icons';
import { Text } from './Text';

type EmptyProps = {
  message: string;
  icon?: AppIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  testID?: string;
};

/** One muted line plus the screen's primary action (README: "Trạng thái rỗng"). */
export function EmptyState({ message, icon, actionLabel, onAction, className, testID }: EmptyProps) {
  return (
    <View testID={testID} className={cn('items-center gap-4 px-6 py-12', className)}>
      {icon ? (
        <View className="h-14 w-14 items-center justify-center rounded-tile bg-line-2">
          <Icon icon={icon} size={24} color="subtle" />
        </View>
      ) : null}
      <Text className="text-center text-body text-muted">{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} size="sm" variant="soft" onPress={onAction} /> : null}
    </View>
  );
}

type ErrorProps = { error: unknown; onRetry?: () => void; className?: string; compact?: boolean };

export function ErrorState({ error, onRetry, className, compact }: ErrorProps) {
  const { t } = useTranslation();
  const message = useErrorMessage(error);
  return (
    <View className={cn('items-center gap-3 px-6', compact ? 'py-6' : 'py-12', className)}>
      <Icon icon={WarningCircleIcon} size={26} color="danger" />
      <Text className="text-center text-body text-ink-2">{message}</Text>
      {onRetry ? <Button label={t('common.retry')} size="sm" variant="ghost" onPress={onRetry} /> : null}
    </View>
  );
}
