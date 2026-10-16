import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatKey, todayKey } from '@/core/time/vn';
import { Button } from '@/shared/ui/Button';
import { PressableCard } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { CircleAlertIcon, ForwardIcon } from '@/shared/ui/icons';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import type { IncomingDoc } from '../types';
import { DeadlineTag } from './DeadlineTag';
import { RoleBadge } from './RoleBadge';

type Props = {
  doc: IncomingDoc;
  onPress: () => void;
  /** "Cần phân phối lại" / "Chuyển người xử lý": shown when I may distribute it now. */
  onDistribute?: () => void;
  today?: string;
};

/**
 * Incoming document row (DocRow): số đến (mono, bold) and số hiệu, received date on the right, the summary on two
 * lines, the sending agency, then role / status, urgency and deadline. A returned document shows the
 * chủ trì's reason in a red box with "Cần phân phối lại".
 */
export function IncomingDocCard({ doc, onPress, onDistribute, today = todayKey() }: Props) {
  const { t } = useTranslation();
  const returned = doc.trangThai === 'bi_tra_lai';
  const unread = !doc.daXem;
  const done = doc.trangThai === 'da_xu_ly' || doc.trangThai === 'khong_xu_ly';

  return (
    <PressableCard
      testID={`doc-${doc.soDen}`}
      accessibilityLabel={`${t('documents.incoming.numberLabel', { soDen: doc.soDen })}, ${doc.trichYeu}`}
      onPress={onPress}
      className="gap-2 p-3.5"
    >
      <View className="flex-row items-center gap-2">
        {unread ? <View accessibilityLabel={t('documents.unread')} className="h-2 w-2 rounded-full bg-primary" /> : null}
        <Text mono weight="bold" style={{ fontSize: 14, lineHeight: 18 }}>
          {doc.soDen}
        </Text>
        <Text mono numberOfLines={1} className="flex-1 text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
          {doc.soHieu}
        </Text>
        <Text mono className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
          {formatKey(doc.ngayNhan, false)}
        </Text>
      </View>

      <Text weight={unread ? 'bold' : 'semibold'} numberOfLines={2} style={{ fontSize: 14, lineHeight: 20 }}>
        {doc.trichYeu}
      </Text>
      <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
        {doc.coQuan}
      </Text>

      <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1.5">
        {doc.daHuy ? (
          <StatusBadge kind="off" label={t('documents.incoming.cancelled')} />
        ) : returned ? (
          <StatusBadge kind="danger" label={t('documents.incoming.returned')} />
        ) : doc.trangThai === 'cho_phan_phoi' ? (
          <StatusBadge kind="wait" label={t('documents.incoming.waitingDistribution')} />
        ) : doc.trangThai === 'khong_xu_ly' ? (
          <StatusBadge kind="off" label={t('documents.incoming.noProcessing')} />
        ) : doc.trangThai === 'da_xu_ly' ? (
          <StatusBadge kind="ok" label={t('documents.incoming.done')} />
        ) : null}
        {doc.vaiTro && !returned ? <RoleBadge role={doc.vaiTro} /> : null}
        {doc.khan && !done ? <StatusBadge kind="danger" label={t('documents.urgent')} /> : null}
        {!done && !doc.daHuy && !returned ? <DeadlineTag han={doc.han} today={today} /> : null}
      </View>

      {returned ? (
        <View className="gap-2.5 rounded-[14px] bg-danger-tint p-3">
          <View className="flex-row gap-2">
            <Icon icon={CircleAlertIcon} size={16} color="danger" />
            <Text className="flex-1 text-danger-deep" style={{ fontSize: 13, lineHeight: 18 }}>
              {doc.lyDoTraLai}
            </Text>
          </View>
          {onDistribute ? (
            <Button testID={`doc-${doc.soDen}-redistribute`} size="md" variant="danger" icon={ForwardIcon} label={t('documents.incoming.redistribute')} onPress={onDistribute} />
          ) : null}
        </View>
      ) : null}
    </PressableCard>
  );
}
