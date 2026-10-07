import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, SectionList, View } from 'react-native';

import { DEFAULT_PAGE_SIZE, flattenPages, nextPageParam } from '@/core/api/types';
import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { useRoomMe } from '@/core/session/useMe';
import { sameId } from '@/core/session/userTypes';
import { addDays, atMinutes, diffDays, formatDateTime, formatDayMonth, minutesOfDay, parseServerDate, toDateKey, vnParts } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { bookingsApi } from '@/features/room-booking/api';
import { useApprovalLevels } from '@/features/room-booking/hooks';
import { bookingFrom, bookingTo } from '@/features/room-booking/logic';
import { ApprovalFilter, BookingStatus, type BookingApprovalHandlerDto, type BookingDto } from '@/features/room-booking/types';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { HeaderBar, HeaderPillButton } from '@/shared/ui/HeaderBar';
import { HeaderSegmented } from '@/shared/ui/HeaderSegmented';
import { HeaderStat, HeaderStatRow } from '@/shared/ui/HeaderStat';
import { ListChecksIcon, StampIcon, XIcon } from '@/shared/ui/icons';
import { NoteField } from '@/shared/ui/NoteField';
import { ScreenShell, SHEET_PADDING } from '@/shared/ui/ScreenShell';
import { GroupTitle } from '@/shared/ui/SectionTitle';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { approvalsApi } from './api';
import { ApprovalCard } from './ApprovalCard';
import { ApproveSheet, BookingSummary, ScopeChoice } from './ApproveSheet';
import { useApprovalStats } from './hooks';
import { dayGroupTitle, groupByDay } from './logic';

type Tab = 'pending' | 'processed';

/** Pending bookings of other groups in the same room overlapping the first session of an item. */
function overlapCount(item: BookingApprovalHandlerDto, schedule: BookingDto[]) {
  const b = item.booking;
  const from = b ? bookingFrom(b) : null;
  if (!b || !from) return 0;
  const day = toDateKey(from);
  // my-approvals aggregates a series: `to` is the last session, so use the time of day only.
  const start = minutesOfDay(from);
  const end = minutesOfDay(bookingTo(b) ?? from);
  return schedule.filter((o) => {
    const oFrom = bookingFrom(o);
    const oTo = bookingTo(o);
    return (
      o.status === BookingStatus.Waiting &&
      !sameId(o.groupId, b.groupId) &&
      sameId(o.roomId ?? o.room?.id, b.roomId ?? b.room?.id) &&
      !!oFrom &&
      !!oTo &&
      toDateKey(oFrom) === day &&
      minutesOfDay(oFrom) < end &&
      minutesOfDay(oTo) > start
    );
  }).length;
}


export function ApprovalInboxScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const connected = useSessionStore((s) => s.connected.room);
  const stats = useApprovalStats();
  const me = useRoomMe();
  const levels = useApprovalLevels();
  const now = useNow(60_000);
  const [tab, setTab] = useState<Tab>('pending');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sheetFor, setSheetFor] = useState<BookingApprovalHandlerDto | null>(null);
  const [rejecting, setRejecting] = useState<BookingApprovalHandlerDto | null>(null);
  const [rejectScope, setRejectScope] = useState<'single' | 'series'>('series');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [bulk, setBulk] = useState<'approve' | 'reject' | null>(null);
  const [bulkComment, setBulkComment] = useState('');

  const status = tab === 'pending' ? ApprovalFilter.Pending : ApprovalFilter.Processed;
  const query = useInfiniteQuery({
    queryKey: qk.approvals.inbox(status),
    queryFn: ({ pageParam }) => approvalsApi.inbox({ status, pageNumber: pageParam, pageSize: DEFAULT_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: connected,
  });
  const items = flattenPages(query.data?.pages);

  // One schedule read covering the first sessions of pending items, to flag overlaps.
  const firsts = items.map((i) => (i.booking ? bookingFrom(i.booking) : null)).filter((d): d is Date => !!d);
  const minDay = firsts.length ? toDateKey(new Date(Math.min(...firsts.map((d) => d.getTime())))) : undefined;
  const maxDay = firsts.length ? toDateKey(new Date(Math.max(...firsts.map((d) => d.getTime())))) : undefined;
  const scheduleEnabled = tab === 'pending' && !!minDay && !!maxDay && diffDays(minDay, maxDay) <= 31;
  const schedule = useQuery({
    queryKey: qk.bookings.schedule({ inbox: true, minDay, maxDay }),
    queryFn: () => bookingsApi.schedule({ fromDate: atMinutes(minDay!, 0).toISOString(), toDate: atMinutes(addDays(maxDay!, 1), 0).toISOString(), status: BookingStatus.Waiting }),
    enabled: scheduleEnabled,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: qk.approvals.root });
    void queryClient.invalidateQueries({ queryKey: qk.bookings.root });
  };

  const exitSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  const bulkMutation = useMutation({
    mutationFn: (kind: 'approve' | 'reject') =>
      kind === 'approve' ? approvalsApi.approveGroups(selected, bulkComment.trim() || undefined) : approvalsApi.rejectGroups(selected, bulkComment.trim() || undefined),
    onSuccess: (_, kind) => {
      toast.success(kind === 'approve' ? t('approvals.bulkApproved', { count: selected.length }) : t('approvals.bulkRejected', { count: selected.length }));
      exitSelecting();
      setBulk(null);
      setBulkComment('');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });

  // Single booking: approve right away, with an undo in the toast.
  const quickApprove = useMutation({
    mutationFn: (bookingId: string) => approvalsApi.approve(bookingId, { isUpdateSingleDay: true }),
    onSuccess: (_, bookingId) => {
      refresh();
      toast.success(t('approvals.approved'), undefined, {
        label: t('approvals.undoShort'),
        onPress: () =>
          approvalsApi
            .undo(bookingId, true)
            .then(() => toast.success(t('approvals.undone')))
            .catch((e) => toast.error(errorMessage(e, t)))
            .finally(refresh),
      });
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });

  const reject = useMutation({
    mutationFn: (item: BookingApprovalHandlerDto) =>
      approvalsApi.reject(item.booking!.id, { comment: rejectReason.trim() || undefined, isUpdateSingleDay: !isSeries(item.booking) || rejectScope === 'single' }),
    onSuccess: () => {
      toast.success(t('approvals.rejected'));
      setRejecting(null);
      setRejectReason('');
      refresh();
    },
    onError: (e) => setRejectError(errorMessage(e, t)),
  });

  const toggle = (groupId: string) => setSelected((list) => (list.includes(groupId) ? list.filter((x) => x !== groupId) : [...list, groupId]));
  const openDetail = (b: BookingDto) => router.push({ pathname: '/rooms/bookings/[id]', params: { id: b.id } });

  const onApprove = (item: BookingApprovalHandlerDto) => {
    const b = item.booking;
    if (!b) return;
    // my-approvals does not fill isSingleBooking; a one-day span is a single session.
    if (b.isSingleBooking ?? !isSeries(b)) quickApprove.mutate(b.id);
    else setSheetFor(item);
  };

  const sections = groupByDay(items, (i) => toDateKey((i.booking ? bookingFrom(i.booking) : null) ?? now)).map((g) => ({
    key: g.key,
    title: dayGroupTitle(g.key, (k) => t(k as 'common.today')),
    data: g.data,
  }));

  const month = vnParts(now).month;
  const statTiles = [
    { key: 'pending', value: stats.data?.pendingApprovalsForUser, label: t('approvals.statPending') },
    { key: 'today', value: stats.data?.bookingsToday, label: t('approvals.statToday') },
    { key: 'done', value: stats.data?.completedApprovalsOfUser, label: t('approvals.statDone', { month }) },
  ];

  const header = (
    <>
      <HeaderBar
        testID="inbox-header"
        title={t('approvals.title')}
        leading="none"
        right={
          <HeaderPillButton
            testID="inbox-select-toggle"
            icon={ListChecksIcon}
            label={selecting ? t('approvals.done') : t('approvals.selectMany')}
            onPress={() => (selecting ? exitSelecting() : setSelecting(true))}
          />
        }
      />
      <HeaderStatRow>
        {statTiles.map((tile) => (
          <HeaderStat key={tile.key} testID={`inbox-stat-${tile.key}`} value={tile.value} label={tile.label} />
        ))}
      </HeaderStatRow>
      <HeaderSegmented
        testID="inbox-tabs"
        value={tab}
        onChange={(value) => {
          setTab(value);
          exitSelecting();
        }}
        options={[
          { value: 'pending', label: t('approvals.pending'), badge: stats.data?.pendingApprovalsForUser ?? 0, testID: 'inbox-tab-pending' },
          { value: 'processed', label: t('approvals.processed'), testID: 'inbox-tab-processed' },
        ]}
      />
    </>
  );

  return (
    <ScreenShell header={header} scroll={false}>
      {query.isLoading ? (
        <View className="p-4">
          <ListSkeleton count={3} lines={3} />
        </View>
      ) : query.isError && !items.length ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: SHEET_PADDING.horizontal, paddingBottom: selected.length ? 110 : SHEET_PADDING.bottom }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => {
                void query.refetch();
                void stats.refetch();
              }}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          renderSectionHeader={({ section }) => <GroupTitle className="pb-2.5 pt-4">{section.title}</GroupTitle>}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => {
            const b = item.booking;
            if (!b) return null;
            const groupId = b.groupId ?? b.id;
            const isSelected = selected.includes(groupId);
            const pending = tab === 'pending';
            return (
              <ApprovalCard
                item={item}
                pending={pending}
                levels={levels(b.roomId ?? b.room?.id)}
                overlaps={pending ? overlapCount(item, schedule.data ?? []) : 0}
                selecting={pending && selecting}
                selected={isSelected}
                onPress={() => (pending && selecting ? toggle(groupId) : openDetail(b))}
                onApprove={() => onApprove(item)}
                onReject={() => {
                  setRejectScope('series');
                  setRejectReason('');
                  setRejectError(null);
                  setRejecting(item);
                }}
                footer={
                  pending ? null : (
                    <View className="gap-1 border-t border-line-2 px-3.5 py-2.5">
                      <StatusBadge
                        kind={item.isApproved ? 'ok' : 'danger'}
                        label={
                          sameId(item.processedBy, me.data?.id)
                            ? item.isApproved
                              ? t('approvals.youApproved')
                              : t('approvals.youRejected')
                            : item.isApproved
                              ? t('approvals.peerApproved')
                              : t('approvals.peerRejected')
                        }
                      />
                      {item.processedAt ? (
                        <Text numberOfLines={2} className="text-meta text-muted">
                          <Text numeric className="text-meta text-muted">{formatDateTime(parseServerDate(item.processedAt))}</Text>
                          {item.comment ? ` · “${item.comment}”` : ''}
                        </Text>
                      ) : null}
                    </View>
                  )
                }
              />
            );
          }}
          ListEmptyComponent={<EmptyState icon={StampIcon} message={tab === 'pending' ? t('approvals.emptyPending') : t('approvals.emptyProcessed')} />}
          ListFooterComponent={query.isFetchingNextPage ? <Text className="py-4 text-center text-meta text-muted">{t('common.loadMore')}</Text> : null}
        />
      )}

      {selected.length ? (
        <View testID="inbox-bulk-bar" className="absolute left-4 right-4 flex-row items-center gap-2 rounded-[16px] py-2.5 pl-4 pr-2.5" style={{ bottom: 16, backgroundColor: '#0F1B2D' }}>
          <Text weight="semibold" numberOfLines={1} className="flex-1 text-body" style={{ color: '#FFFFFF' }}>
            {t('approvals.selected', { count: selected.length })}
          </Text>
          <Button testID="inbox-bulk-reject" size="sm" variant="inverse-soft" label={t('approvals.reject')} onPress={() => setBulk('reject')} />
          <Button testID="inbox-bulk-approve" size="sm" variant="inverse" label={t('approvals.approve')} onPress={() => setBulk('approve')} />
        </View>
      ) : null}

      <ApproveSheet
        bookingId={sheetFor?.booking?.id ?? null}
        levelLabel={sheetFor?.approvalHandler?.approvalStep?.order ? t('approvals.level', { order: sheetFor.approvalHandler.approvalStep.order }) : undefined}
        onClose={() => setSheetFor(null)}
        onDone={refresh}
      />

      <BottomSheet
        testID="reject-sheet"
        visible={!!rejecting}
        onClose={() => setRejecting(null)}
        icon={XIcon}
        iconTone="danger"
        title={t('approvals.rejectSheetTitle')}
        caption={rejecting?.booking?.code ?? undefined}
        footer={
          <View className="gap-2.5">
            {rejectError ? <Banner tone="danger">{rejectError}</Banner> : null}
            <Button testID="reject-sheet-confirm" variant="danger" icon={XIcon} label={t('approvals.reject')} loading={reject.isPending} onPress={() => rejecting && reject.mutate(rejecting)} />
          </View>
        }
      >
        {rejecting?.booking ? <BookingSummary booking={rejecting.booking} /> : null}
        {rejecting && isSeries(rejecting.booking) ? (
          <ScopeChoice
            value={rejectScope}
            onChange={setRejectScope}
            date={formatDayMonthOf(rejecting.booking)}
            seriesNote={t('approvals.seriesUntil', { date: formatDayMonth(bookingTo(rejecting.booking!)) })}
          />
        ) : null}
        <NoteField testID="reject-note" value={rejectReason} onChangeText={setRejectReason} placeholder={t('approvals.rejectNote')} />
      </BottomSheet>

      <BottomSheet
        visible={!!bulk}
        onClose={() => setBulk(null)}
        title={bulk === 'approve' ? t('approvals.bulkApproveTitle', { count: selected.length }) : t('approvals.bulkRejectTitle', { count: selected.length })}
        footer={
          <Button
            testID="inbox-bulk-confirm"
            variant={bulk === 'approve' ? 'success' : 'danger'}
            label={bulk === 'approve' ? t('approvals.approve') : t('approvals.reject')}
            loading={bulkMutation.isPending}
            onPress={() => bulk && bulkMutation.mutate(bulk)}
          />
        }
      >
        <Text className="text-sub text-muted">{t('approvals.bulkHint')}</Text>
        <NoteField value={bulkComment} onChangeText={setBulkComment} placeholder={bulk === 'approve' ? t('approvals.note') : t('approvals.rejectNote')} />
      </BottomSheet>
    </ScreenShell>
  );
}

/** my-approvals aggregates a series: `from` is the first session and `to` the last one. */
function isSeries(b?: BookingDto | null) {
  const from = b ? bookingFrom(b) : null;
  const to = b ? bookingTo(b) : null;
  return !!from && !!to && toDateKey(from) !== toDateKey(to);
}

function formatDayMonthOf(b?: BookingDto | null) {
  const from = b ? bookingFrom(b) : null;
  return from ? `${String(vnParts(from).day).padStart(2, '0')}/${String(vnParts(from).month).padStart(2, '0')}` : '';
}
