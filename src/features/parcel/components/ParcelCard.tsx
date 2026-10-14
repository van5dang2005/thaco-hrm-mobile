import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { sameId } from '@/core/session/userTypes';
import type { ColorToken } from '@/core/theme/palette';
import { formatDayMonth, formatKey, formatTime, parseServerDate } from '@/core/time/vn';
import { PressableCard } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { type AppIcon, CalendarOffIcon, CircleCheckIcon, PackageIcon } from '@/shared/ui/icons';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { RoundIcon, type RoundIconTone } from '@/shared/ui/RoundIcon';
import { parcelBadgeKind } from '@/shared/ui/status';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { useToneColors, type Tone } from '@/shared/ui/tones';

import { ParcelStatus, type ParcelLookupDto } from '../types';
import { isOpenParcel, parcelDeadline, senderTitle } from '../utils/parcel';
import { daysLeftLabel } from './DeadlineBars';

/** Package icon tone follows the status badge (wait / warn / danger / ok / off). */
export const parcelIconTone = (status: ParcelStatus): RoundIconTone => parcelBadgeKind(status) as RoundIconTone;

type Props = { parcel: ParcelLookupDto; myCode?: string | null; onPress: () => void };

/**
 * Card of "Bưu phẩm của tôi" (6d): icon in the status tone, sender, tracking code and description, a
 * pill with what matters now ("Còn 7 ngày", "Quá hạn 2 ngày", "Đã nhận", "Đã hủy"), then the timeline
 * row (received → due, with a bar), who collected it, or when it was dropped.
 */
export function ParcelCard({ parcel, myCode, onPress }: Props) {
  const { t } = useTranslation();
  const deadline = parcelDeadline(parcel);
  const open = isOpenParcel(parcel.status);
  const kind = parcelBadgeKind(parcel.status);
  const handOverAt = parseServerDate(parcel.handOverAt);
  const meta = { fontSize: 12, lineHeight: 17 };
  const collector = sameId(parcel.actualReceiverCode, myCode) ? t('parcels.handedYouDirect') : t('parcels.handedBy', { code: parcel.actualReceiverCode ?? '' });
  const pill =
    open && deadline
      ? daysLeftLabel(t, deadline)
      : parcel.status === ParcelStatus.HandedOver
        ? t('parcels.badgeReceived')
        : t(`status.parcelShort.${String(parcel.status) as '4'}`);

  return (
    <PressableCard testID={`parcel-${parcel.trackingNumber}`} onPress={onPress} className="gap-3 p-3.5" style={{ flexShrink: 0 }}>
      <View className="flex-row gap-3">
        <RoundIcon icon={PackageIcon} size={44} square tone={parcelIconTone(parcel.status)} />
        <View className="min-w-0 flex-1 justify-center gap-0.5">
          <View className="flex-row items-start gap-2">
            <Text weight="bold" numberOfLines={1} className="min-w-0 flex-1" style={{ fontSize: 14.5, lineHeight: 20 }}>
              {senderTitle(parcel)}
            </Text>
            <StatusBadge kind={kind} label={pill} dot />
          </View>
          <Text mono numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {parcel.trackingNumber}
          </Text>
          {parcel.description ? (
            <Text numberOfLines={1} className="text-subtle" style={meta}>
              {parcel.description}
            </Text>
          ) : null}
        </View>
      </View>

      {open && deadline ? <Timeline parcel={parcel} /> : null}

      {parcel.status === ParcelStatus.HandedOver && handOverAt ? (
        <FooterLine icon={CircleCheckIcon} color="success">
          {`${t('parcels.handedPrefix')} `}
          <Text mono weight="bold" className="text-ink" style={meta}>{`${formatTime(handOverAt)} · ${formatDayMonth(handOverAt)}`}</Text>
          {parcel.actualReceiverCode ? ` · ${collector}` : ''}
        </FooterLine>
      ) : null}

      {parcel.status === ParcelStatus.Cancelled && deadline ? (
        <FooterLine icon={CalendarOffIcon} color="subtle">
          {t('parcels.cancelledAuto', { date: formatKey(deadline.cancelKey, false) })}
        </FooterLine>
      ) : null}
    </PressableCard>
  );
}

/** Open parcels: "Tiếp nhận 09:12 · 14/10" on the left, the due (or auto-cancel) date on the right, a 4pt bar under. */
function Timeline({ parcel }: { parcel: ParcelLookupDto }) {
  const { t } = useTranslation();
  const deadline = parcelDeadline(parcel)!;
  const tone = useToneColors(parcelBadgeKind(parcel.status) as Tone);
  const received = parseServerDate(parcel.receivedAt ?? parcel.createdAt);
  const overdue = parcel.status === ParcelStatus.Overdue;
  const small = { fontSize: 11.5, lineHeight: 15 };
  return (
    <View className="gap-2 border-t border-line-2 pt-2.5">
      <View className="flex-row items-center justify-between gap-2">
        <Text numberOfLines={1} className="flex-shrink text-muted" style={small}>
          {received ? t('parcels.receivedAt', { time: formatTime(received), date: formatDayMonth(received) }) : ''}
        </Text>
        <Text weight="semibold" numberOfLines={1} style={{ ...small, color: overdue ? tone.text : undefined }} className={overdue ? undefined : 'text-ink-2'}>
          {overdue ? t('parcels.autoCancel', { date: formatKey(deadline.cancelKey, false) }) : t('parcels.dueOn', { date: formatKey(deadline.dueKey, false) })}
        </Text>
      </View>
      <ProgressBar value={deadline.dueProgress} color={tone.solid} track={tone.tint} height={4} />
    </View>
  );
}

/** Hairline, then a glyph and one or two lines of muted text (received / cancelled cards). */
function FooterLine({ icon, color, children }: { icon: AppIcon; color: ColorToken; children: ReactNode }) {
  return (
    <View className="flex-row items-start gap-2 border-t border-line-2 pt-2.5">
      <View style={{ paddingTop: 1 }}>
        <Icon icon={icon} size={15} weight="bold" color={color} />
      </View>
      <Text numberOfLines={2} className="min-w-0 flex-1 text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
        {children}
      </Text>
    </View>
  );
}
