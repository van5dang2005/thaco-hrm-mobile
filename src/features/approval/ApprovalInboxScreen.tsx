import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';

import { DEFAULT_PAGE_SIZE, flattenPages, nextPageParam } from '@/core/api/types';
import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { useRoomMe } from '@/core/session/useMe';
import { sameId } from '@/core/session/userTypes';
import { addDays, atMinutes, diffDays, formatDateTime, minutesOfDay, parseServerDate, toDateKey } from '@/core/time/vn';
import { bookingsApi } from '@/features/room-booking/api';
import { inferRecurrence } from '@/features/room-booking/draftStore';
import { useApprovalLevels, useWorkflows } from '@/features/room-booking/hooks';
import { bookingFrom, bookingTo } from '@/features/room-booking/logic';
import { ApprovalFilter, BookingStatus, type BookingApprovalHandlerDto, type BookingDto } from '@/features/room-booking/types';
import { useNow } from '@/shared/hooks/useNow';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { FloatingCard } from '@/shared/ui/Card';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { HeaderSearch } from '@/shared/ui/HeaderSearch';
import { HeaderSegmented } from '@/shared/ui/HeaderSegmented';
import { CalendarIcon, CheckIcon, HourglassIcon, ListChecksIcon, SearchIcon, SquareCheckBigIcon, TriangleAlertIcon, XIcon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { CONTENT_PADDING, ModuleScreen } from '@/shared/ui/ModuleScreen';
import { NoteField } from '@/shared/ui/NoteField';
import { shadows } from '@/shared/ui/shadows';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { StatStrip } from '@/shared/ui/StatStrip';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { approvalsApi } from './api';
import { ApprovalCard } from './ApprovalCard';
import { ApproveSheet, RejectSheet } from './ApproveSheet';
import { useApprovalStats } from './hooks';
import { isSeries } from './logic';

type Tab = 'pending' | 'processed' | 'series';

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

/** "Duyệt" tab (5a): requests waiting for me, approve or reject on the card, bulk actions, processed history. */
export function ApprovalInboxScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const connected = useSessionStore((s) => s.connected.room);
  const stats = useApprovalStats();
  const me = useRoomMe();
  const levels = useApprovalLevels();
  const workflows = useWorkflows();
  const now = useNow(60_000);
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [approving, setApproving] = useState<BookingApprovalHandlerDto | null>(null);
  const [rejecting, setRejecting] = useState<BookingApprovalHandlerDto | null>(null);
  const [bulk, setBulk] = useState<'approve' | 'reject' | null>(null);
  const [bulkComment, setBulkComment] = useState('');

  const pendingTab = tab !== 'processed';
  const status = pendingTab ? ApprovalFilter.Pending : ApprovalFilter.Processed;
  const keyword = search?.trim() || undefined;
  const query = useInfiniteQuery({
    queryKey: qk.approvals.inbox(status, keyword),
    queryFn: ({ pageParam }) => approvalsApi.inbox({ status, pageNumber: pageParam, pageSize: DEFAULT_PAGE_SIZE, search: keyword }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: connected,
  });
  const all = flattenPages(query.data?.pages);
  const items = (tab === 'series' ? all.filter((i) => isSeries(i.booking)) : all).slice().sort((a, b) => (a.booking?.from ?? '').localeCompare(b.booking?.from ?? ''));
  const seriesCount = pendingTab ? all.filter((i) => isSeries(i.booking)).length : 0;

  // One schedule read covering the first sessions of pending items, to flag overlaps and count series sessions.
  const firsts = all.map((i) => (i.booking ? bookingFrom(i.booking) : null)).filter((d): d is Date => !!d);
  const lasts = all.map((i) => (i.booking ? bookingTo(i.booking) : null)).filter((d): d is Date => !!d);
  const minDay = firsts.length ? toDateKey(new Date(Math.min(...firsts.map((d) => d.getTime())))) : undefined;
  const maxDay = lasts.length ? toDateKey(new Date(Math.max(...lasts.map((d) => d.getTime())))) : undefined;
  const scheduleEnabled = pendingTab && !!minDay && !!maxDay && diffDays(minDay, maxDay) <= 62;
  const schedule = useQuery({
    queryKey: qk.bookings.schedule({ inbox: true, minDay, maxDay }),
    queryFn: () => bookingsApi.schedule({ fromDate: atMinutes(minDay!, 0).toISOString(), toDate: atMinutes(addDays(maxDay!, 1), 0).toISOString(), status: BookingStatus.Waiting }),
    enabled: scheduleEnabled,
  });
  const scheduled = schedule.data ?? [];
  /** "5 buổi · hằng tuần" for a series, from its sessions in the schedule read. */
  const repeatOf = (b: BookingDto) => {
    const days = scheduled
      .filter((o) => sameId(o.groupId, b.groupId))
      .map((o) => toDateKey(bookingFrom(o) ?? new Date(0)))
      .sort();
    if (days.length < 2) return undefined;
    const { recurrence } = inferRecurrence(days);
    return t('approvals.repeatValue', { count: days.length, recurrence: (recurrence === 'weekly' ? t('meeting.recurrenceWeekly') : t('meeting.recurrenceDaily')).toLowerCase() });
  };
  const conflicts = pendingTab ? all.filter((i) => overlapCount(i, scheduled) > 0).length : 0;

  // Rooms whose workflow lists me as an approver ("bạn là người duyệt N phòng").
  const myRooms = new Set(
    (workflows.data ?? []).filter((w) => (w.approvalSteps ?? []).some((s) => (s.approvalHandlers ?? []).some((h) => sameId(h.userId, me.data?.id)))).map((w) => w.roomId),
  ).size;

  // Aggregated rows carry no approvalStep: find the level of my handler in the room workflows.
  const handlerOrder = new Map<string, number>();
  (workflows.data ?? []).forEach((w) => (w.approvalSteps ?? []).forEach((s) => (s.approvalHandlers ?? []).forEach((h) => handlerOrder.set(h.id.toLowerCase(), s.order ?? 0))));
  const orderOf = (item: BookingApprovalHandlerDto) => item.approvalHandler?.approvalStep?.order ?? handlerOrder.get(item.approvalHandlerId?.toLowerCase() ?? '') ?? null;

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

  const toggle = (groupId: string) => setSelected((list) => (list.includes(groupId) ? list.filter((x) => x !== groupId) : [...list, groupId]));
  const openDetail = (b: BookingDto) => router.push({ pathname: '/rooms/bookings/[id]', params: { id: b.id } });

  const header = (
    <ModuleHeader
      testID="inbox-header"
      icon={ListChecksIcon}
      title={t('approvals.title')}
      titleSize="lg"
      subtitle={myRooms ? t('approvals.subtitle', { count: myRooms }) : undefined}
      leading="none"
      right={
        <>
          <HeaderIconButton testID="inbox-search" icon={SearchIcon} label={t('common.search')} onPress={() => setSearch((v) => (v === null ? '' : null))} />
          <HeaderIconButton
            testID="inbox-select-toggle"
            icon={selecting ? XIcon : ListChecksIcon}
            variant={selecting ? 'solid' : 'tint'}
            label={selecting ? t('approvals.done') : t('approvals.selectMany')}
            onPress={() => (selecting ? exitSelecting() : setSelecting(true))}
          />
        </>
      }
    >
      {search !== null ? <HeaderSearch testID="inbox-search-input" value={search} onChange={setSearch} onClose={() => setSearch(null)} placeholder={t('myMeetings.searchPlaceholder')} /> : null}
      <HeaderSegmented
        testID="inbox-tabs"
        className=""
        value={tab}
        onChange={(value) => {
          setTab(value);
          exitSelecting();
        }}
        options={[
          { value: 'pending', label: t('approvals.pending'), badge: stats.data?.pendingApprovalsForUser ?? 0, testID: 'inbox-tab-pending' },
          { value: 'processed', label: t('approvals.processed'), badge: stats.data?.completedApprovalsOfUser ?? 0, badgeTone: 'neutral', testID: 'inbox-tab-processed' },
          { value: 'series', label: t('approvals.seriesTab'), badge: seriesCount, badgeTone: 'neutral', testID: 'inbox-tab-series' },
        ]}
      />
    </ModuleHeader>
  );

  const floating = (
    <FloatingCard>
      <StatStrip
        items={[
          { key: 'pending', icon: HourglassIcon, tone: 'wait', value: stats.data?.pendingApprovalsForUser ?? '–', label: t('approvals.statPending') },
          { key: 'today', icon: CalendarIcon, tone: 'ok', value: stats.data?.bookingsToday ?? '–', label: t('approvals.statTodayShort') },
          { key: 'conflicts', icon: TriangleAlertIcon, tone: 'warn', value: conflicts, label: t('approvals.statConflicts') },
        ]}
      />
    </FloatingCard>
  );

  return (
    <ModuleScreen header={header} floating={floating} scroll={false}>
      {query.isLoading ? (
        <View className="p-4">
          <ListSkeleton count={3} lines={3} />
        </View>
      ) : query.isError && !items.length ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: CONTENT_PADDING.horizontal, paddingTop: CONTENT_PADDING.top, paddingBottom: selected.length ? 120 : CONTENT_PADDING.bottom, gap: 12 }}
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
          renderItem={({ item }) => {
            const b = item.booking;
            if (!b) return null;
            const groupId = b.groupId ?? b.id;
            return (
              <ApprovalCard
                item={item}
                order={orderOf(item)}
                pending={pendingTab}
                levels={levels(b.roomId ?? b.room?.id)}
                overlaps={pendingTab ? overlapCount(item, scheduled) : 0}
                repeat={repeatOf(b)}
                selecting={pendingTab && selecting}
                selected={selected.includes(groupId)}
                now={now}
                onPress={() => (pendingTab && selecting ? toggle(groupId) : openDetail(b))}
                onDetail={() => openDetail(b)}
                onApprove={() => setApproving(item)}
                onReject={() => setRejecting(item)}
                footer={pendingTab ? null : <ProcessedFooter item={item} myId={me.data?.id} />}
              />
            );
          }}
          ListEmptyComponent={<EmptyState icon={SquareCheckBigIcon} message={pendingTab ? t('approvals.emptyPending') : t('approvals.emptyProcessed')} />}
          ListFooterComponent={query.isFetchingNextPage ? <Text className="py-4 text-center text-meta text-muted">{t('common.loadMore')}</Text> : null}
        />
      )}

      {selected.length ? (
        <View testID="inbox-bulk-bar" className="absolute bottom-4 left-4 right-4 flex-row items-center gap-2 rounded-[18px] bg-elevated py-2.5 pl-4 pr-2.5" style={shadows.card}>
          <Text weight="bold" numberOfLines={1} className="flex-1 text-ink" style={{ fontSize: 14, lineHeight: 19 }}>
            {t('approvals.selected', { count: selected.length })}
          </Text>
          <Button testID="inbox-bulk-reject" size="md" variant="danger-outline" icon={XIcon} label={t('approvals.reject')} onPress={() => setBulk('reject')} />
          <Button testID="inbox-bulk-approve" size="md" variant="success" icon={CheckIcon} label={t('approvals.approve')} onPress={() => setBulk('approve')} />
        </View>
      ) : null}

      <ApproveSheet
        bookingId={approving?.booking?.id ?? null}
        level={approving && orderOf(approving) ? { order: orderOf(approving)!, total: levels(approving.booking?.roomId ?? approving.booking?.room?.id) } : null}
        overlaps={approving ? overlapCount(approving, scheduled) : 0}
        onClose={() => setApproving(null)}
        onDone={refresh}
      />
      <RejectSheet bookingId={rejecting?.booking?.id ?? null} onClose={() => setRejecting(null)} onDone={refresh} />

      <BottomSheet
        visible={!!bulk}
        onClose={() => setBulk(null)}
        icon={bulk === 'approve' ? SquareCheckBigIcon : XIcon}
        iconTone={bulk === 'approve' ? 'ok' : 'danger'}
        title={bulk === 'approve' ? t('approvals.bulkApproveTitle', { count: selected.length }) : t('approvals.bulkRejectTitle', { count: selected.length })}
        subtitle={t('approvals.bulkHint')}
        footer={
          <Button
            testID="inbox-bulk-confirm"
            size="xl"
            variant={bulk === 'approve' ? 'success' : 'danger-outline'}
            label={bulk === 'approve' ? t('approvals.approve') : t('approvals.reject')}
            loading={bulkMutation.isPending}
            onPress={() => bulk && bulkMutation.mutate(bulk)}
          />
        }
      >
        <NoteField value={bulkComment} onChangeText={setBulkComment} placeholder={bulk === 'approve' ? t('approvals.note') : t('approvals.rejectNote')} />
      </BottomSheet>
    </ModuleScreen>
  );
}

/** Processed tab: who decided, when, and the comment. */
function ProcessedFooter({ item, myId }: { item: BookingApprovalHandlerDto; myId?: string }) {
  const { t } = useTranslation();
  const mine = sameId(item.processedBy, myId);
  const label = item.isApproved ? (mine ? t('approvals.youApproved') : t('approvals.peerApproved')) : mine ? t('approvals.youRejected') : t('approvals.peerRejected');
  return (
    <View className="gap-1 border-t border-line-2 pt-3">
      <StatusBadge kind={item.isApproved ? 'ok' : 'danger'} label={label} dot />
      {item.processedAt ? (
        <Text numberOfLines={2} className="text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
          <Text mono className="text-muted" style={{ fontSize: 12 }}>
            {formatDateTime(parseServerDate(item.processedAt))}
          </Text>
          {item.comment ? ` · “${item.comment}”` : ''}
        </Text>
      ) : null}
    </View>
  );
}
