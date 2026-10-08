import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { diffDays, formatDayMonth, parseServerDate, todayKey, toDateKey } from '@/core/time/vn';
import { DelegationStatus, DelegationType, type DelegationDto, type DelegationUser, type ParcelLookupDto } from '@/features/parcel/types';
import { useNow } from '@/shared/hooks/useNow';
import { Avatar } from '@/shared/ui/Avatar';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { CalendarRangeIcon, ChevronRightIcon, PackageIcon } from '@/shared/ui/icons';
import { PersonRow } from '@/shared/ui/PersonRow';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { Eyebrow } from '@/shared/ui/SectionTitle';
import { DelegationBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { useToneColors, type Tone } from '@/shared/ui/tones';

export const delegationPerson = (u?: DelegationUser | null) =>
  u ? { id: u.id, name: u.fullname ?? u.username, code: u.employeeCode, department: u.departmentName, avatarUrl: u.avatarUrl } : { id: '', name: '—' };

type Props = {
  delegation: DelegationDto;
  /** 'mine' = I am the authorizer (show the delegate); 'toMe' = I am the delegate (show the owner). */
  side: 'mine' | 'toMe';
  parcel?: Pick<ParcelLookupDto, 'senderFullName' | 'senderCompanyName' | 'trackingNumber'> | null;
  /** Default delegations to me: parcels of the owner waiting at the desk. */
  waitingCount?: number;
  onPressWaiting?: () => void;
  actions?: ReactNode;
  testID?: string;
};

const barTone = (status: DelegationStatus): Tone => (status === DelegationStatus.DueSoon ? 'warn' : status === DelegationStatus.Waiting ? 'wait' : 'ok');

/** Grey panel: start date · "còn N ngày" · end date (mono), then a 5pt bar colored by status (6f / 6g). */
function DateBar({ delegation }: { delegation: DelegationDto }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const now = useNow(60_000);
  const tone = useToneColors(barTone(delegation.status));
  const start = parseServerDate(delegation.startDate);
  const end = parseServerDate(delegation.endDate);
  if (!start || !end) return null;
  const progress = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  const left = diffDays(todayKey(now), toDateKey(end));
  const date = { fontSize: 12, lineHeight: 16 };
  return (
    <View className="gap-1.5 rounded-[12px] bg-panel px-3 py-2.5">
      <View className="flex-row items-center justify-between gap-2">
        <Text mono weight="semibold" style={date}>
          {formatDayMonth(start)}
        </Text>
        {now < start ? null : (
          <Text weight="bold" numberOfLines={1} className="flex-shrink" style={{ fontSize: 11.5, lineHeight: 15, color: tone.solid }}>
            {left > 0 ? t('delegations.daysLeft', { count: left }) : t('delegations.endsToday')}
          </Text>
        )}
        <Text mono weight="semibold" style={date}>
          {formatDayMonth(end)}
        </Text>
      </View>
      <ProgressBar value={progress} color={tone.solid} track={colors.line} height={5} />
    </View>
  );
}

/** Eyebrow with the kind's glyph: "MẶC ĐỊNH · THEO THỜI GIAN" / "CHI TIẾT · THEO BƯU PHẨM". */
function KindLabel({ isDefault }: { isDefault: boolean }) {
  const { t } = useTranslation();
  return (
    <View className="min-w-0 flex-shrink flex-row items-center gap-1.5">
      <Icon icon={isDefault ? CalendarRangeIcon : PackageIcon} size={13} color="muted" />
      <Eyebrow>{isDefault ? t('delegations.defaultLabel') : t('delegations.detailedLabel')}</Eyebrow>
    </View>
  );
}

/** Delegation card of 6f (Tôi ủy quyền) / 6g (Được ủy quyền). Ringed while it waits for my answer. */
export function DelegationCard({ delegation: d, side, parcel, waitingCount, onPressWaiting, actions, testID }: Props) {
  const { t } = useTranslation();
  const isDefault = d.appliedType === DelegationType.Default;
  const other = side === 'mine' ? d.delegator : d.authorizer;
  const awaitingMe = side === 'toMe' && d.status === DelegationStatus.Waiting;
  const from = formatDayMonth(parseServerDate(d.startDate));
  const to = formatDayMonth(parseServerDate(d.endDate));
  const body = { fontSize: 13, lineHeight: 19.5 };

  return (
    <Card testID={testID} highlight={awaitingMe} className="gap-3 p-3.5" style={{ flexShrink: 0 }}>
      <View className="flex-row items-center justify-between gap-2">
        <KindLabel isDefault={isDefault} />
        <DelegationBadge status={d.status} dot label={awaitingMe ? t('delegations.awaitingYou') : undefined} />
      </View>
      <PersonRow person={delegationPerson(other)} size={40} strong />

      {isDefault && !awaitingMe && d.status !== DelegationStatus.Rejected ? <DateBar delegation={d} /> : null}

      {awaitingMe ? (
        <Text className="text-ink-2" style={body}>
          {isDefault ? (
            <Trans i18nKey="delegations.wantsDefault" values={{ from, to }} components={{ b: <Text mono weight="bold" className="text-ink" style={body} /> }} />
          ) : (
            t('delegations.wantsDetailed')
          )}
        </Text>
      ) : null}

      {!isDefault && parcel ? (
        <View className="flex-row items-center gap-2.5 rounded-[12px] bg-panel px-2.5 py-2">
          <RoundIcon icon={PackageIcon} size={30} square />
          <View className="min-w-0 flex-1">
            <Text weight="semibold" numberOfLines={1} style={{ fontSize: 12.5, lineHeight: 17 }}>
              {parcel.senderCompanyName || parcel.senderFullName}
            </Text>
            <Text mono numberOfLines={1} className="text-muted" style={{ fontSize: 11, lineHeight: 15 }}>
              {parcel.trackingNumber}
            </Text>
          </View>
        </View>
      ) : null}

      {d.status === DelegationStatus.Waiting && side === 'mine' && !d.pendingEndDate ? (
        <Text className="text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
          {t('delegations.requireApproval', { name: other?.fullname ?? '' })}
        </Text>
      ) : null}

      {d.pendingEndDate ? <Banner tone="info">{t('delegations.pendingRenew', { date: formatDayMonth(parseServerDate(d.pendingEndDate)) })}</Banner> : null}

      {side === 'toMe' && isDefault && !awaitingMe && waitingCount ? <WaitingAtDesk count={waitingCount} onPress={onPressWaiting} /> : null}

      {actions ? <View className="flex-row gap-2">{actions}</View> : null}
    </Card>
  );
}

/** Dashed amber row "N bưu phẩm chờ ở lễ tân ›" on default delegations to me (6g). */
function WaitingAtDesk({ count, onPress }: { count: number; onPress?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center justify-between gap-2 rounded-[12px] px-3 py-2.5 active:opacity-80"
      style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: `${colors.warning}59`, backgroundColor: colors['warn-box'] }}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <RoundIcon icon={PackageIcon} size={28} square tone="warn" />
        <Text numberOfLines={1} className="flex-shrink" style={{ fontSize: 12.5, lineHeight: 17 }}>
          <Text weight="bold" style={{ fontSize: 12.5 }}>
            {String(count)}
          </Text>
          {` ${t('delegations.waitingAtReception', { count })}`}
        </Text>
      </View>
      <Icon icon={ChevronRightIcon} size={15} color="subtle" />
    </Pressable>
  );
}

/** Expired delegation, collapsed to one dimmed row (6f). */
export function DelegationRow({ delegation: d, side }: { delegation: DelegationDto; side: 'mine' | 'toMe' }) {
  const { t } = useTranslation();
  const other = side === 'mine' ? d.delegator : d.authorizer;
  const range =
    d.appliedType === DelegationType.Default ? `${formatDayMonth(parseServerDate(d.startDate))} → ${formatDayMonth(parseServerDate(d.endDate))}` : t('delegations.detailedShort');
  return (
    <Card style={{ flexShrink: 0 }}>
      <View className="flex-row items-center gap-3 px-3.5 py-3" style={{ opacity: 0.75 }}>
        <Avatar name={other?.fullname} uri={other?.avatarUrl} size={36} />
        <View className="min-w-0 flex-1 gap-px">
          <Text weight="semibold" numberOfLines={1} style={{ fontSize: 14, lineHeight: 19 }}>
            {other?.fullname ?? '—'}
          </Text>
          <Text mono numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {range}
          </Text>
        </View>
        <DelegationBadge status={d.status} />
      </View>
    </Card>
  );
}
