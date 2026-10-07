import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { sameId } from '@/core/session/userTypes';
import { formatDayMonth, formatKey, formatTime, isSameVnDay, parseServerDate } from '@/core/time/vn';
import { Avatar } from '@/shared/ui/Avatar';
import { PressableCard } from '@/shared/ui/Card';
import { PackageIcon } from '@/shared/ui/icons';
import { RoundIcon, type RoundIconTone } from '@/shared/ui/RoundIcon';
import { parcelBadgeKind } from '@/shared/ui/status';
import { ParcelBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import { isOpenParcel, parcelDeadline, senderTitle } from '../logic';
import { MatchReason, ParcelStatus, type ParcelLookupDto } from '../types';
import { DeadlineBar } from './DeadlineBars';

/** Package icon tone follows the status badge (wait / warn / danger / ok / off). */
export const parcelIconTone = (status: ParcelStatus): RoundIconTone => parcelBadgeKind(status) as RoundIconTone;

type Props = { parcel: ParcelLookupDto; myCode?: string | null; onPress: () => void };

/** Card of "Bưu phẩm của tôi" (6d): icon, sender, tracking code, badge, deadline bar, "Nhận thay cho …". */
export function ParcelCard({ parcel, myCode, onPress }: Props) {
  const { t } = useTranslation();
  const deadline = parcelDeadline(parcel);
  const open = isOpenParcel(parcel.status);
  const cancelled = parcel.status === ParcelStatus.Cancelled;
  const handed = parcel.status === ParcelStatus.HandedOver;
  const handOverAt = parseServerDate(parcel.handOverAt);
  const received = parseServerDate(parcel.receivedAt ?? parcel.createdAt);
  const meta =
    handed && handOverAt
      ? `${t('parcels.handedAt', { time: formatTime(handOverAt), date: formatDayMonth(handOverAt) })} · ${
          sameId(parcel.actualReceiverCode, myCode) ? t('parcels.handedYou') : t('parcels.handedCode', { code: parcel.actualReceiverCode ?? '' })
        }`
      : cancelled && deadline
        ? t('parcels.cancelledAuto', { date: formatKey(deadline.cancelKey, false) })
        : !open && received
          ? t('parcels.receivedAt', { time: formatTime(received), date: isSameVnDay(received, new Date()) ? t('parcels.today') : formatDayMonth(received) })
          : null;

  return (
    <PressableCard testID={`parcel-${parcel.trackingNumber}`} onPress={onPress} className="gap-3 p-3.5" style={{ flexShrink: 0 }}>
      <View className="flex-row items-center gap-3" style={{ opacity: cancelled ? 0.75 : 1 }}>
        <RoundIcon icon={PackageIcon} tone={parcelIconTone(parcel.status)} />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text weight="semibold" numberOfLines={1} style={{ fontSize: 15, lineHeight: 20 }}>
            {senderTitle(parcel)}
          </Text>
          <Text mono numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {parcel.trackingNumber}
          </Text>
        </View>
        <ParcelBadge status={parcel.status} short />
      </View>

      {open && deadline ? <DeadlineBar status={parcel.status} deadline={deadline} /> : null}
      {meta ? (
        <Text numberOfLines={2} className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
          {meta}
        </Text>
      ) : null}

      {parcel.matchReason !== MatchReason.Direct ? (
        <View className="flex-row items-center gap-2 rounded-[12px] bg-field px-2.5 py-2">
          <Avatar name={parcel.delegatorFullName} uri={parcel.delegationAvatarUrl} size={24} />
          <Text numberOfLines={2} className="flex-1" style={{ fontSize: 13, lineHeight: 18 }}>
            {`${t('parcels.onBehalf')} `}
            <Text weight="bold" style={{ fontSize: 13 }}>
              {parcel.delegatorFullName}
            </Text>
            {` · ${parcel.matchReason === MatchReason.DefaultDelegation ? t('parcels.viaDefaultShort') : t('parcels.viaDetailedShort')}`}
          </Text>
        </View>
      ) : null}
    </PressableCard>
  );
}
