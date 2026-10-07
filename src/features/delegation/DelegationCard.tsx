import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatDayMonth, parseServerDate } from '@/core/time/vn';
import { DelegationStatus, DelegationType, type DelegationDto, type DelegationUser, type ParcelLookupDto } from '@/features/parcel/types';
import { useNow } from '@/shared/hooks/useNow';
import { Avatar } from '@/shared/ui/Avatar';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { CaretRightIcon, PackageIcon } from '@/shared/ui/icons';
import { PersonRow } from '@/shared/ui/PersonRow';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { Eyebrow } from '@/shared/ui/SectionTitle';
import { DelegationBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

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

/** "0187_VTP…182": keeps the sequence and the last digits of long tracking codes. */
function shortTracking(code: string) {
  return code.length > 16 ? `${code.slice(0, 9)}…${code.slice(-3)}` : code;
}

/** start ━━━━━━━ end, mono dates, bar colored by status (6f / 6g). */
function DateBar({ delegation }: { delegation: DelegationDto }) {
  const { colors } = useTheme();
  const now = useNow(60_000);
  const start = parseServerDate(delegation.startDate);
  const end = parseServerDate(delegation.endDate);
  if (!start || !end) return null;
  const progress = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  const color = delegation.status === DelegationStatus.DueSoon ? colors.warning : delegation.status === DelegationStatus.Waiting ? colors.primary : colors.success;
  return (
    <View className="flex-row items-center gap-2.5">
      <Text mono weight="medium" style={{ fontSize: 12.5, lineHeight: 17 }}>
        {formatDayMonth(start)}
      </Text>
      <View className="flex-1">
        <ProgressBar value={progress} color={color} />
      </View>
      <Text mono weight="medium" style={{ fontSize: 12.5, lineHeight: 17 }}>
        {formatDayMonth(end)}
      </Text>
    </View>
  );
}

/** Delegation card of 6f (Tôi ủy quyền) / 6g (Được ủy quyền). Highlighted while it waits for my answer. */
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
        <Eyebrow>{isDefault ? t('delegations.defaultLabel') : t('delegations.detailedLabel')}</Eyebrow>
        <DelegationBadge status={d.status} label={awaitingMe ? t('delegations.awaitingYou') : undefined} />
      </View>
      <PersonRow person={delegationPerson(other)} size={44} strong />

      {isDefault && !awaitingMe && d.status !== DelegationStatus.Rejected ? <DateBar delegation={d} /> : null}

      {awaitingMe ? (
        <Text className="text-ink-2" style={body}>
          {isDefault ? (
            <Trans i18nKey="delegations.wantsDefault" values={{ from, to }} components={{ b: <Text mono weight="semibold" className="text-ink" style={body} /> }} />
          ) : parcel ? (
            t('delegations.wantsDetailed', { tracking: parcel.trackingNumber })
          ) : (
            t('delegations.wantsDetailedUnknown')
          )}
        </Text>
      ) : null}

      {!isDefault && parcel ? (
        <View className="flex-row items-center gap-2.5 rounded-[12px] bg-field px-2.5 py-2">
          <RoundIcon icon={PackageIcon} size={28} tone="wait" />
          <Text numberOfLines={1} className="min-w-0 flex-1" style={{ fontSize: 12.5, lineHeight: 17 }}>
            {parcel.senderCompanyName || parcel.senderFullName}
          </Text>
          <Text mono numberOfLines={1} className="text-muted" style={{ fontSize: 11, lineHeight: 15 }}>
            {shortTracking(parcel.trackingNumber)}
          </Text>
        </View>
      ) : null}

      {isDefault && side === 'mine' && d.status !== DelegationStatus.Expired && d.status !== DelegationStatus.Rejected ? (
        <Text className="text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
          {t('delegations.defaultScope')}
        </Text>
      ) : null}

      {d.status === DelegationStatus.Waiting && side === 'mine' && !d.pendingEndDate ? (
        <Text className="text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
          {t('delegations.requireApproval', { name: other?.fullname ?? '' })}
        </Text>
      ) : null}

      {d.pendingEndDate ? <Banner tone="info">{t('delegations.pendingRenew', { date: formatDayMonth(parseServerDate(d.pendingEndDate)) })}</Banner> : null}

      {side === 'toMe' && isDefault && !awaitingMe && waitingCount ? (
        <Pressable accessibilityRole="button" onPress={onPressWaiting} className="flex-row items-center justify-between gap-2 rounded-[12px] bg-field px-3 py-2.5 active:opacity-80">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <RoundIcon icon={PackageIcon} size={28} tone="warn" />
            <Text numberOfLines={1} className="flex-shrink" style={{ fontSize: 13, lineHeight: 18 }}>
              {t('delegations.waitingAtReception', { count: waitingCount })}
            </Text>
          </View>
          <Icon icon={CaretRightIcon} size={15} color="subtle" />
        </Pressable>
      ) : null}

      {actions ? <View className="flex-row gap-2">{actions}</View> : null}
    </Card>
  );
}

/** Expired delegation, collapsed to one dimmed row (6f). */
export function DelegationRow({ delegation: d, side }: { delegation: DelegationDto; side: 'mine' | 'toMe' }) {
  const other = side === 'mine' ? d.delegator : d.authorizer;
  const range = d.appliedType === DelegationType.Default ? `${formatDayMonth(parseServerDate(d.startDate))} → ${formatDayMonth(parseServerDate(d.endDate))}` : '';
  return (
    <Card style={{ flexShrink: 0 }}>
      <View className="flex-row items-center gap-3 px-3.5 py-3" style={{ opacity: 0.75 }}>
        <Avatar name={other?.fullname} uri={other?.avatarUrl} size={32} />
        <View className="min-w-0 flex-1">
          <Text weight="medium" numberOfLines={1} style={{ fontSize: 13.5, lineHeight: 18 }}>
            {other?.fullname ?? '—'}
          </Text>
          {range ? (
            <Text mono numberOfLines={1} className="text-subtle" style={{ fontSize: 11.5, lineHeight: 15 }}>
              {range}
            </Text>
          ) : null}
        </View>
        <DelegationBadge status={d.status} />
      </View>
    </Card>
  );
}
