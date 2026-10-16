import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatKey } from '@/core/time/vn';
import { PressableCard } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { BellIcon } from '@/shared/ui/icons';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import type { SharedDoc } from '../types';
import { isUnread } from '../utils/shared';

/** Shared document row: số hiệu · loại · date, the summary, the issuing unit; unread = primary dot + bold. */
export function SharedDocRow({ doc, onPress }: { doc: SharedDoc; onPress: () => void }) {
  const { t } = useTranslation();
  const unread = isUnread(doc);
  return (
    <PressableCard testID={`shared-${doc.soHieu}`} accessibilityLabel={`${doc.soHieu}, ${doc.trichYeu}`} onPress={onPress} className="gap-1.5 p-3.5">
      <View className="flex-row items-center gap-2">
        {unread ? <View accessibilityLabel={t('documents.unread')} className="h-2 w-2 rounded-full bg-primary" /> : null}
        <Text mono weight="bold" numberOfLines={1} className={doc.daHuy ? 'text-subtle line-through' : undefined} style={{ fontSize: 13.5, lineHeight: 18 }}>
          {doc.soHieu}
        </Text>
        <Text numberOfLines={1} className="flex-1 text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
          {doc.loai}
        </Text>
        <Text mono className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
          {formatKey(doc.ngayGui, false)}
        </Text>
      </View>
      <Text weight={unread ? 'bold' : 'medium'} numberOfLines={2} className={doc.daHuy ? 'text-subtle line-through' : undefined} style={{ fontSize: 14, lineHeight: 20 }}>
        {doc.trichYeu}
      </Text>
      <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
        {doc.donVi}
      </Text>
      {doc.daHuy || doc.hanPhanHoi ? (
        <View className="mt-0.5 flex-row flex-wrap gap-2">
          {doc.daHuy ? <StatusBadge kind="off" label={t('documents.shared.cancelled')} /> : null}
          {doc.hanPhanHoi && !doc.daHuy ? (
            <View className="flex-row items-center gap-1 rounded-full bg-warning-tint px-2 py-0.5">
              <Icon icon={BellIcon} size={12} color="warning-text" weight="bold" />
              <Text weight="semibold" className="text-warning-text" style={{ fontSize: 12, lineHeight: 15 }}>
                {t('documents.shared.replyBy', { date: formatKey(doc.hanPhanHoi, false) })}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </PressableCard>
  );
}
