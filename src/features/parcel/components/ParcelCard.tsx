import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { sameId } from '@/core/session/userTypes';
import { formatDayMonth, formatKey, formatTime, parseServerDate } from '@/core/time/vn';
import { Avatar } from '@/shared/ui/Avatar';
import { PressableCard } from '@/shared/ui/Card';
import { PackageIcon } from '@/shared/ui/icons';
import { RoundIcon, type RoundIconTone } from '@/shared/ui/RoundIcon';
import { parcelBadgeKind } from '@/shared/ui/status';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import { isOpenParcel, parcelDeadline, senderTitle } from '../logic';
import { MatchReason, ParcelStatus, type ParcelLookupDto } from '../types';
import { DeadlineBar } from './DeadlineBars';

/** Package icon tone follows the status badge (wait / warn / danger / ok / off). */
export const parcelIconTone = (status: ParcelStatus): RoundIconTone => parcelBadgeKind(status) as RoundIconTone;

type Props = { parcel: ParcelLookupDto; myCode?: string | null; onPress: () => void };

/** Card of "Bưu phẩm của tôi" (6d): icon, sender, tracking code, badge, then the deadline / handover / cancel line. */
export function ParcelCard({ parcel, myCode, onPress }: Props) {
  const { t } = useTranslation();
  const deadline = parcelDeadline(parcel);
  const open = isOpenParcel(parcel.status);
  const cancelled = parcel.status === ParcelStatus.Cancelled;
  const handOverAt = parseServerDate(parcel.handOverAt);
  const meta = { fontSize: 12, lineHeight: 17 };
  // From the receiver's side a handed-over parcel reads "Đã nhận" rather than "Đã giao".
  const badgeLabel = parcel.status === ParcelStatus.HandedOver ? t('parcels.badgeReceived') : t(`status.parcelShort.${String(parcel.status) as '1'}`);

  const collector = sameId(parcel.actualReceiverCode, myCode)
    ? sameId(parcel.receiverCode, myCode)
      ? t('parcels.handedYouDirect')
      : t('parcels.handedYouBehalf')
    : t('parcels.handedBy', { code: parcel.actualReceiverCode ?? '' });

  return (
    <PressableCard testID={`parcel-${parcel.trackingNumber}`} onPress={onPress} className="gap-3 p-3.5" style={{ flexShrink: 0 }}>
      <View className="flex-row items-center gap-3">
        <RoundIcon icon={PackageIcon} size={44} square tone={parcelIconTone(parcel.status)} />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text weight="bold" numberOfLines={1} style={{ fontSize: 14.5, lineHeight: 19 }}>
            {senderTitle(parcel)}
          </Text>
          <Text mono numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {parcel.trackingNumber}
          </Text>
        </View>
        <StatusBadge kind={parcelBadgeKind(parcel.status)} label={badgeLabel} dot className="self-start" />
      </View>

      {open && deadline ? <DeadlineBar status={parcel.status} deadline={deadline} /> : null}

      {parcel.status === ParcelStatus.HandedOver && handOverAt ? (
        <Text numberOfLines={2} className="border-t border-line-2 pt-2.5 text-muted" style={meta}>
          {`${t('parcels.handedPrefix')} `}
          <Text mono weight="bold" className="text-ink" style={meta}>{`${formatTime(handOverAt)} · ${formatDayMonth(handOverAt)}`}</Text>
          {parcel.actualReceiverCode ? ` · ${collector}` : ''}
        </Text>
      ) : null}

      {cancelled && deadline ? (
        <Text numberOfLines={2} className="border-t border-line-2 pt-2.5 text-subtle" style={meta}>
          {t('parcels.cancelledAuto', { date: formatKey(deadline.cancelKey, false) })}
        </Text>
      ) : null}

      {parcel.matchReason !== MatchReason.Direct ? (
        <View className="flex-row items-center gap-2.5 rounded-[12px] bg-panel px-2.5 py-2">
          <Avatar name={parcel.delegatorFullName} uri={parcel.delegationAvatarUrl} size={28} />
          <Text numberOfLines={2} className="min-w-0 flex-1" style={{ fontSize: 12.5, lineHeight: 17 }}>
            {`${t('parcels.onBehalf')} `}
            <Text weight="bold" style={{ fontSize: 12.5 }}>
              {parcel.delegatorFullName}
            </Text>
          </Text>
          <StatusBadge kind="off" label={t('parcels.delegation')} />
        </View>
      ) : null}
    </PressableCard>
  );
}
