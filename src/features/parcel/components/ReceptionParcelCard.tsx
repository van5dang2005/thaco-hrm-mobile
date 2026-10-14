import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatDayMonth, formatTime, isSameVnDay, parseServerDate } from '@/core/time/vn';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/Avatar';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon } from '@/shared/ui/icons';
import { useCardStyle } from '@/shared/ui/Card';
import { ParcelBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import { ParcelStatus, type ParcelDto } from '../types';
import { isOpenParcel, parcelDeadline, senderTitle } from '../utils/parcel';
import { DeadlineBar } from './DeadlineBars';

type Props = {
  parcel: ParcelDto;
  selected: boolean;
  onToggle: () => void;
  onPress: () => void;
};

/** Reception list card: tracking + status, sender, receiver, deadline. */
export function ReceptionParcelCard({ parcel: p, selected, onToggle, onPress }: Props) {
  const { t } = useTranslation();
  const cardStyle = useCardStyle(false, selected);
  const open = isOpenParcel(p.status);
  const cancelled = p.status === ParcelStatus.Cancelled;
  const deadline = parcelDeadline(p);
  const received = parseServerDate(p.receivedAt ?? p.createdAt);
  const receivedText = received
    ? t('parcels.receivedAt', { time: formatTime(received), date: isSameVnDay(received, new Date()) ? t('parcels.today') : formatDayMonth(received) })
    : '';

  return (
    <Pressable
      testID={`reception-parcel-${p.trackingNumber}`}
      accessibilityRole="button"
      onPress={onPress}
      className={cn('flex-row gap-3 rounded-card p-3.5 active:opacity-90', cancelled && 'opacity-80')}
      style={[cardStyle, { flexShrink: 0 }]}
    >
      {open ? (
        <Pressable
          testID={`reception-check-${p.trackingNumber}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
          onPress={onToggle}
          hitSlop={12}
          className={cn('mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-[7px]', selected ? 'bg-primary' : 'border-2 border-line-strong')}
        >
          {selected ? <Icon icon={CheckIcon} size={12} weight="bold" color="on-primary" /> : null}
        </Pressable>
      ) : null}

      <View className="min-w-0 flex-1 gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <Text mono weight="medium" numberOfLines={1} className={cn('flex-1 text-meta', cancelled ? 'text-subtle' : 'text-muted')}>
            {p.trackingNumber}
          </Text>
          <ParcelBadge status={p.status} short />
        </View>

        <View className="gap-[3px]">
          <Text weight="semibold" className={cn('text-card', cancelled && 'text-muted')} numberOfLines={2}>
            {senderTitle(p)}
          </Text>
          <Text className="text-meta text-muted" numberOfLines={1}>
            {receivedText}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Avatar name={p.receiverFullName} uri={p.receiverAvatarUrl} size={24} />
          <Text className="flex-1 text-sub-sm" numberOfLines={1}>
            <Text weight="semibold" className="text-sub-sm">
              {p.receiverFullName}
            </Text>
            {` · ${[p.receiverCode, p.departmentName].filter(Boolean).join(' · ')}`}
          </Text>
        </View>

        {open && deadline ? <DeadlineBar status={p.status} deadline={deadline} /> : null}
      </View>
    </Pressable>
  );
}
