import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useCapabilities } from '@/core/session/capabilities';
import { useParcelMe } from '@/core/session/useMe';
import { sameId } from '@/core/session/userTypes';
import { formatDate, formatDayMonth, formatTime, parseServerDate } from '@/core/time/vn';
import { goBack } from '@/shared/lib/navigation';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { HeaderBar, HeaderIconButton } from '@/shared/ui/HeaderBar';
import { HeaderPill, useHeaderDot } from '@/shared/ui/HeaderPill';
import { DotsThreeIcon, NoteIcon, UserCheckIcon } from '@/shared/ui/icons';
import { KeyValueRow } from '@/shared/ui/KeyValueRow';
import { NoteField } from '@/shared/ui/NoteField';
import { PersonRow } from '@/shared/ui/PersonRow';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { ScreenShell, useHeaderColors } from '@/shared/ui/ScreenShell';
import { SectionTitle } from '@/shared/ui/SectionTitle';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/StateViews';
import { parcelBadgeKind } from '@/shared/ui/status';
import { DelegationBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { parcelsApi } from './api';
import { LifecyclePanel } from './components/DeadlineBars';
import { ParcelTimeline } from './components/ParcelTimeline';
import { PhotoStrip } from './components/PhotoStrip';
import { useMyDelegations, useParcel } from './hooks';
import { activeDefaultOf, isOpenParcel, parcelDeadline, senderTitle } from './logic';
import { DelegationStatus, ParcelStatus, type RelatedUserSummary } from './types';

const summaryPerson = (u?: RelatedUserSummary | null) =>
  u ? { id: u.id, name: u.fullName ?? u.username, code: u.employeeCode, department: u.departmentName, avatarUrl: u.avatarUrl } : null;

type MoreAction = { label: string; destructive?: boolean; onPress: () => void };

/** Chi tiết bưu phẩm (6e): status + lifecycle on the header; info, delegation and history in the sheet. */
export function ParcelDetailScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { fg, sub } = useHeaderColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const parcel = useParcel(id);
  const me = useParcelMe();
  const delegations = useMyDelegations();
  const { has } = useCapabilities();
  const reception = has('parcel.reception');
  const [noteOpen, setNoteOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const p = parcel.data;
  const statusDot = useHeaderDot(parcelBadgeKind(p?.status));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: qk.parcels.root });
    void queryClient.invalidateQueries({ queryKey: qk.delegations.root });
  };
  const onError = (e: unknown) => toast.error(errorMessage(e, t));

  const remind = useMutation({ mutationFn: () => parcelsApi.remind(id), onSuccess: () => toast.success(t('parcels.reminded')), onError });
  const remove = useMutation({
    mutationFn: () => parcelsApi.remove(id),
    onSuccess: () => {
      toast.success(t('parcels.deleted'));
      refresh();
      goBack('/parcels');
    },
    onError,
  });
  const saveCancelNote = useMutation({
    mutationFn: () => {
      const current = parcel.data!;
      return parcelsApi.update(id, {
        trackingNumber: current.trackingNumber,
        senderFullName: current.senderFullName,
        receiverId: current.receiverId,
        departmentId: current.departmentId,
        attachmentFiles: [],
        attachmentIds: current.attachments.map((a) => a.id),
        cancellationNote: cancelNote.trim(),
      });
    },
    onSuccess: () => {
      toast.success(t('parcels.cancelNoteSaved'));
      setNoteOpen(false);
      refresh();
    },
    onError,
  });

  const title = t('parcels.detailTitle');

  if (!p) {
    return (
      <ScreenShell header={<HeaderBar title={title} />}>
        {parcel.isError ? <ErrorState error={parcel.error} onRetry={() => void parcel.refetch()} /> : <ListSkeleton count={3} />}
      </ScreenShell>
    );
  }

  const open = isOpenParcel(p.status);
  const deadline = parcelDeadline(p);
  const isMine = sameId(p.receiverId, me.data?.id);
  const related = p.relatedDelegation;
  const blockingDefault = activeDefaultOf(delegations.data ?? [], me.data?.id);
  const handOverAt = parseServerDate(p.handOverAt);
  const cancelledAt = parseServerDate(p.cancelledAt);

  const confirmDelete = () =>
    Alert.alert(t('parcels.delete'), t('parcels.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('parcels.delete'), style: 'destructive', onPress: () => remove.mutate() },
    ]);

  // Reception actions per the state matrix (CLAUDE.md §2.3); the rest goes to the "…" menu.
  const actions: ReactNode[] = [];
  const more: MoreAction[] = [];
  if (reception) {
    if (p.status === ParcelStatus.Waiting) {
      actions.push(<Button key="edit" testID="parcel-edit" className="flex-1" variant="ghost" label={t('parcels.edit')} onPress={() => router.push({ pathname: '/parcels/reception/new', params: { id: p.id } })} />);
      more.push({ label: t('parcels.delete'), destructive: true, onPress: confirmDelete });
    }
    if (p.status === ParcelStatus.Due || p.status === ParcelStatus.Overdue) {
      actions.push(<Button key="remind" testID="parcel-remind" className="flex-1" variant="ghost" label={t('parcels.remind')} loading={remind.isPending} onPress={() => remind.mutate()} />);
    }
    if (open) {
      actions.push(
        <Button key="handover" testID="parcel-handover" className="flex-1" icon={UserCheckIcon} label={t('parcels.handover')} onPress={() => router.push({ pathname: '/parcels/reception/handover', params: { ids: p.id } })} />,
      );
    }
    if (p.status === ParcelStatus.Cancelled && !p.cancellationReason) {
      actions.push(<Button key="note" className="flex-1" variant="ghost" label={t('parcels.addCancelNote')} onPress={() => setNoteOpen(true)} />);
    }
  }

  const header = (
    <>
      <HeaderBar
        testID="parcel-header"
        title={title}
        right={
          more.length ? (
            <HeaderIconButton
              testID="parcel-more"
              icon={DotsThreeIcon}
              label={t('common.more')}
              onPress={() =>
                Alert.alert(p.transactionCode, undefined, [
                  ...more.map((m) => ({ text: m.label, style: m.destructive ? ('destructive' as const) : ('default' as const), onPress: m.onPress })),
                  { text: t('common.cancel'), style: 'cancel' as const },
                ])
              }
            />
          ) : undefined
        }
      />
      <View className="gap-2 px-3 pt-2">
        <View className="flex-row">
          <HeaderPill testID="parcel-status" label={t(`status.parcel.${String(p.status) as '1'}`)} dotColor={statusDot} />
        </View>
        <Text weight="bold" numberOfLines={2} accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, color: fg }}>
          {senderTitle(p)}
        </Text>
        <Text mono numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 17, color: sub }}>
          {`${p.trackingNumber} · ${p.transactionCode}`}
        </Text>
        {p.status === ParcelStatus.HandedOver && handOverAt ? (
          <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 18, color: sub }}>
            {`${t('parcels.handedOverOn', { date: `${formatTime(handOverAt)} ${formatDate(handOverAt)}` })}${p.actualReceiverCode ? ` · ${p.actualReceiverCode}` : ''}`}
          </Text>
        ) : null}
        {p.status === ParcelStatus.Cancelled ? (
          <Text numberOfLines={1} style={{ fontSize: 13, lineHeight: 18, color: sub }}>
            {t('parcels.cancelledOn', { date: cancelledAt ? formatDayMonth(cancelledAt) : '' })}
          </Text>
        ) : null}
      </View>
      {open && deadline ? <LifecyclePanel status={p.status} deadline={deadline} /> : null}
    </>
  );

  return (
    <ScreenShell header={header} footer={actions.length ? actions : undefined} refreshControl={<RefreshControl refreshing={parcel.isRefetching} onRefresh={() => void parcel.refetch()} />}>
      <Card>
        <KeyValueRow label={t('parcels.sender')} value={[p.senderFullName, p.senderPhoneNumber].filter(Boolean).join(' · ')} />
        {p.senderCompanyName && p.senderCompanyName !== p.senderFullName ? <KeyValueRow divider label={t('parcels.company')} value={p.senderCompanyName} /> : null}
        {p.senderAddress ? <KeyValueRow divider label={t('parcels.senderAddress')} value={p.senderAddress} /> : null}
        {!isMine ? <KeyValueRow divider label={t('parcels.receiver')} value={`${p.receiverFullName} · ${p.receiverCode}`} /> : null}
        <KeyValueRow divider label={t('parcels.department')} value={p.departmentName ?? '—'} />
        {p.description ? <KeyValueRow divider label={t('parcels.description')} value={p.description} /> : null}
        {p.note ? <KeyValueRow divider label={t('parcels.note')} value={p.note} /> : null}
        {p.cancellationReason ? <KeyValueRow divider label={t('parcels.cancellationReason')} value={p.cancellationReason} /> : null}
        {p.attachments.length ? (
          <View className="border-t border-line-2 px-3.5 py-3">
            <PhotoStrip attachments={p.attachments} />
          </View>
        ) : null}
      </Card>

      {open && related ? (
        <Card className="gap-3 p-3.5">
          <SectionTitle right={<DelegationBadge status={related.status} />}>{t('parcels.delegatedTo')}</SectionTitle>
          {summaryPerson(related.delegator) ? <PersonRow person={summaryPerson(related.delegator)!} size={40} strong /> : null}
          <Text className="text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
            {related.parcelId
              ? t('parcels.delegationDetailed')
              : t('parcels.delegationDefault', { from: formatDayMonth(parseServerDate(related.startDate)), to: formatDayMonth(parseServerDate(related.endDate)) })}
          </Text>
          {related.status === DelegationStatus.Waiting && related.pendingEndDate ? (
            <Banner tone="info">{t('parcels.pendingRenew', { date: formatDayMonth(parseServerDate(related.pendingEndDate)) })}</Banner>
          ) : null}
        </Card>
      ) : open && isMine ? (
        <Card className="flex-row items-center gap-3 p-3.5">
          <RoundIcon icon={UserCheckIcon} tone="wait" />
          <View className="min-w-0 flex-1 gap-0.5">
            <Text weight="semibold" style={{ fontSize: 14, lineHeight: 19 }}>
              {t('parcels.noDelegate')}
            </Text>
            <Text className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
              {blockingDefault ? t('parcels.defaultBlocks') : t('parcels.noDelegateHint')}
            </Text>
          </View>
          {!blockingDefault ? (
            <Button testID="parcel-delegate" size="sm" label={t('parcels.delegate')} onPress={() => router.push({ pathname: '/parcels/delegations/new', params: { parcelId: p.id } })} />
          ) : null}
        </Card>
      ) : null}

      {p.logs.length ? (
        <Card className="gap-3 px-4 py-3.5">
          <SectionTitle>{t('parcels.history')}</SectionTitle>
          <ParcelTimeline logs={p.logs} status={p.status} />
        </Card>
      ) : null}

      <BottomSheet
        visible={noteOpen}
        onClose={() => setNoteOpen(false)}
        icon={NoteIcon}
        iconTone="off"
        title={t('reception.cancelNote')}
        caption={p.transactionCode}
        footer={<Button label={t('common.save')} loading={saveCancelNote.isPending} disabled={!cancelNote.trim()} onPress={() => saveCancelNote.mutate()} />}
      >
        <Text className="text-sub text-muted">{t('reception.cancelNoteHint')}</Text>
        <NoteField value={cancelNote} onChangeText={setCancelNote} />
      </BottomSheet>
    </ScreenShell>
  );
}
