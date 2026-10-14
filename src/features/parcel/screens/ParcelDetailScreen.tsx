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
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card, FloatingCard } from '@/shared/ui/Card';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { HeaderPill, useHeaderDot } from '@/shared/ui/HeaderPill';
import { EllipsisIcon, StickyNoteIcon, UserCheckIcon, PackageIcon } from '@/shared/ui/icons';
import { KeyValueRow } from '@/shared/ui/KeyValueRow';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { NoteField } from '@/shared/ui/NoteField';
import { useHeaderColors } from '@/shared/ui/ScreenShell';
import { SectionTitle } from '@/shared/ui/SectionTitle';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/StateViews';
import { parcelBadgeKind } from '@/shared/ui/status';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';

import { parcelsApi } from '../api/parcel.api';
import { daysLeftLabel, LifecyclePanel } from '../components/DeadlineBars';
import { ParcelTimeline } from '../components/ParcelTimeline';
import { PhotoStrip } from '../components/PhotoStrip';
import { useParcel } from '../hooks/useParcel';
import { ParcelStatus } from '../types';
import { isOpenParcel, MAX_PARCEL_FILES, parcelDeadline, senderTitle } from '../utils/parcel';

type MoreAction = { label: string; destructive?: boolean; onPress: () => void };

/** Chi tiết bưu phẩm (6e): status + lifecycle on the header, info card over it, photos and history below. */
export function ParcelDetailScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { fg, text2 } = useHeaderColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const parcel = useParcel(id);
  const pull = usePullRefresh(() => parcel.refetch());
  const me = useParcelMe();
  const { has } = useCapabilities();
  const reception = has('parcel.reception');
  const [noteOpen, setNoteOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const p = parcel.data;
  const statusDot = useHeaderDot(parcelBadgeKind(p?.status));

  const refresh = () => void queryClient.invalidateQueries({ queryKey: qk.parcels.root });
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

  const header = (content: ReactNode, right?: ReactNode, bottom = 18) => (
    <ModuleHeader testID="parcel-header" icon={PackageIcon} title={t('parcels.detailTitle')} subtitle={p?.trackingNumber} subtitleMono right={right} bottom={bottom}>
      {content}
    </ModuleHeader>
  );

  if (!p) {
    return (
      <ModuleScreen header={header(null, undefined, 24)}>
        {parcel.isError ? <ErrorState error={parcel.error} onRetry={() => void parcel.refetch()} /> : <ListSkeleton count={3} />}
      </ModuleScreen>
    );
  }

  const open = isOpenParcel(p.status);
  const deadline = parcelDeadline(p);
  const isMine = sameId(p.receiverId, me.data?.id);
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
        <Button key="handover" testID="parcel-handover" className="flex-[1.4]" icon={UserCheckIcon} label={t('parcels.handover')} onPress={() => router.push({ pathname: '/parcels/reception/handover', params: { ids: p.id } })} />,
      );
    }
    if (p.status === ParcelStatus.Cancelled && !p.cancellationReason) {
      actions.push(<Button key="note" className="flex-1" variant="ghost" label={t('parcels.addCancelNote')} onPress={() => setNoteOpen(true)} />);
    }
  }

  const moreButton = more.length ? (
    <HeaderIconButton
      testID="parcel-more"
      icon={EllipsisIcon}
      label={t('common.more')}
      onPress={() =>
        Alert.alert(p.transactionCode, undefined, [
          ...more.map((m) => ({ text: m.label, style: m.destructive ? ('destructive' as const) : ('default' as const), onPress: m.onPress })),
          { text: t('common.cancel'), style: 'cancel' as const },
        ])
      }
    />
  ) : undefined;

  const statusLabel = t(`status.parcel.${String(p.status) as '1'}`);
  const pill =
    p.status === ParcelStatus.Overdue && deadline
      ? daysLeftLabel(t, deadline)
      : open && deadline
        ? `${statusLabel} · ${daysLeftLabel(t, deadline).toLocaleLowerCase()}`
        : statusLabel;
  const closedLine =
    p.status === ParcelStatus.HandedOver && handOverAt
      ? `${t('parcels.handedOverOn', { date: `${formatTime(handOverAt)} ${formatDate(handOverAt)}` })}${p.actualReceiverCode ? ` · ${p.actualReceiverCode}` : ''}`
      : p.status === ParcelStatus.Cancelled
        ? t('parcels.cancelledOn', { date: cancelledAt ? formatDayMonth(cancelledAt) : '' })
        : null;

  const headerContent = (
    <View className="gap-2.5">
      <View className="flex-row">
        <HeaderPill testID="parcel-status" label={pill} dotColor={statusDot} />
      </View>
      <Text weight="bold" numberOfLines={2} accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, letterSpacing: -0.3, color: fg }}>
        {senderTitle(p)}
      </Text>
      {closedLine ? (
        <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 18, color: text2 }}>
          {closedLine}
        </Text>
      ) : null}
      {open && deadline ? <LifecyclePanel status={p.status} deadline={deadline} /> : null}
    </View>
  );

  const sender = [p.senderFullName, p.senderCompanyName && p.senderCompanyName !== p.senderFullName ? p.senderCompanyName : null].filter(Boolean).join(' · ');
  const info = (
    <FloatingCard radius={20} testID="parcel-info">
      <KeyValueRow label={t('parcels.sender')} value={sender} />
      {p.senderPhoneNumber ? <KeyValueRow divider label={t('parcels.senderPhone')} value={p.senderPhoneNumber} mono /> : null}
      {p.senderAddress ? <KeyValueRow divider label={t('parcels.senderAddress')} value={p.senderAddress} /> : null}
      <KeyValueRow divider label={t('parcels.code')} value={p.transactionCode} mono />
      {!isMine ? <KeyValueRow divider label={t('parcels.receiver')} value={`${p.receiverFullName} · ${p.receiverCode}`} /> : null}
      <KeyValueRow divider label={t('parcels.department')} value={p.departmentName ?? '—'} />
      {p.description ? <KeyValueRow divider label={t('parcels.description')} value={p.description} /> : null}
      {p.note ? <KeyValueRow divider label={t('parcels.note')} value={p.note} /> : null}
      {p.cancellationReason ? <KeyValueRow divider label={t('parcels.cancellationReason')} value={p.cancellationReason} /> : null}
    </FloatingCard>
  );

  return (
    <ModuleScreen
      header={header(headerContent, moreButton)}
      floating={info}
      floatingScrolls
      footer={actions.length ? actions : undefined}
      refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={() => void pull.onRefresh()} />}
    >
      {p.attachments.length ? (
        <Card className="gap-2.5 p-3.5">
          <SectionTitle right={`${p.attachments.length}/${MAX_PARCEL_FILES}`}>{t('parcels.photosTitle')}</SectionTitle>
          <PhotoStrip attachments={p.attachments} />
        </Card>
      ) : null}

      {p.logs.length ? (
        <Card className="gap-3 p-3.5">
          <SectionTitle>{t('parcels.history')}</SectionTitle>
          <ParcelTimeline logs={p.logs} status={p.status} />
        </Card>
      ) : null}

      <BottomSheet
        visible={noteOpen}
        onClose={() => setNoteOpen(false)}
        icon={StickyNoteIcon}
        iconTone="off"
        title={t('reception.cancelNote')}
        caption={p.transactionCode}
        footer={<Button label={t('common.save')} loading={saveCancelNote.isPending} disabled={!cancelNote.trim()} onPress={() => saveCancelNote.mutate()} />}
      >
        <Text className="text-sub text-muted">{t('reception.cancelNoteHint')}</Text>
        <NoteField value={cancelNote} onChangeText={setCancelNote} />
      </BottomSheet>
    </ModuleScreen>
  );
}
