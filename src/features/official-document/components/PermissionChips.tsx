import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, LockIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import type { SharePermissions } from '../types';
import { PERMISSIONS } from '../utils/sharing';

/** "Quyền của bạn": Xem / Tải / Chia sẻ; held = primary tint with a tick, missing = grey with a lock. */
export function PermissionChips({ quyen }: { quyen: SharePermissions }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row flex-wrap gap-2" testID="shared-permissions">
      {PERMISSIONS.map((key) => {
        const held = quyen[key];
        return (
          <View
            key={key}
            accessibilityLabel={`${t(`documents.perm.${key}`)}: ${held ? t('documents.permHeld') : t('documents.permMissing')}`}
            className={`h-[30px] flex-row items-center gap-1.5 rounded-full px-3 ${held ? 'bg-primary-tint' : 'bg-off-tint'}`}
          >
            <Icon icon={held ? CheckIcon : LockIcon} size={13} weight="bold" color={held ? 'primary-tint-text' : 'subtle'} />
            <Text weight="semibold" className={held ? 'text-primary-tint-text' : 'text-subtle'} style={{ fontSize: 12.5, lineHeight: 16 }}>
              {t(`documents.perm.${key}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
