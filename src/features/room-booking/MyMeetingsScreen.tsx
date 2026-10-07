import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, SectionList, View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { useRoomMe } from '@/core/session/useMe';
import { addDays, atMinutes, todayKey, toDateKey, type DateKey } from '@/core/time/vn';
import { dayGroupTitle, groupByDay } from '@/features/approval/logic';
import { useNow } from '@/shared/hooks/useNow';
import { HeaderBar, HeaderIconButton } from '@/shared/ui/HeaderBar';
import { HeaderSegmented } from '@/shared/ui/HeaderSegmented';
import { CalendarDotsIcon, PlusIcon } from '@/shared/ui/icons';
import { ScreenShell, SHEET_PADDING } from '@/shared/ui/ScreenShell';
import { GroupTitle } from '@/shared/ui/SectionTitle';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { toast } from '@/shared/ui/Toast';

import { bookingsApi } from './api';
import { ExtendSheet } from './components/ExtendSheet';
import { MyMeetingItem } from './components/MyMeetingItem';
import { defaultDraft, useBookingDraft } from './draftStore';
import { bookingFrom } from './logic';
import { isUpcoming, weekKeys, weekStartOf } from './myMeetings';
import type { BookingDto } from './types';
import { WeekStrip } from './ui/WeekStrip';

type Tab = 'upcoming' | 'past';
const WINDOW_PAGE_SIZE = 100;

/** "Lịch" tab (5b): bookings I created (GET /api/bookings/get-my-bookings) for the week on screen. */
export function MyMeetingsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const connected = useSessionStore((s) => s.connected.room);
  const me = useRoomMe();
  const startDraft = useBookingDraft((s) => s.start);
  const now = useNow(30_000);
  const today = todayKey(now);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [selectedDay, setSelectedDay] = useState<DateKey>(today);
  const [weekStart, setWeekStart] = useState<DateKey>(() => weekStartOf(todayKey()));
  const [extending, setExtending] = useState<BookingDto | null>(null);
  const listRef = useRef<SectionList<BookingDto>>(null);

  // One read covers the previous, current and next week so dots stay filled while swiping.
  const windowFrom = addDays(weekStart, -7);
  const windowTo = addDays(weekStart, 14);
  const query = useQuery({
    queryKey: qk.bookings.mine({ window: windowFrom, scope: 'my-meetings' }),
    queryFn: () =>
      bookingsApi.mine({ pageNumber: 1, pageSize: WINDOW_PAGE_SIZE, fromDate: atMinutes(windowFrom, 0).toISOString(), toDate: atMinutes(windowTo, 0).toISOString() }),
    enabled: connected,
    select: (page) => page.items,
  });
  const all = query.data ?? [];

  const days = new Set(weekKeys(weekStart));
  const items = all
    .filter((b) => {
      const from = bookingFrom(b);
      return !!from && days.has(toDateKey(from)) && isUpcoming(b, now) === (tab === 'upcoming');
    })
    .sort((a, b) => (tab === 'upcoming' ? 1 : -1) * (a.from ?? '').localeCompare(b.from ?? ''));
  const sections = groupByDay(items, (b) => toDateKey(bookingFrom(b) ?? now)).map((g) => ({ key: g.key, title: dayGroupTitle(g.key, (k) => t(k as 'common.today'), today), data: g.data }));

  const refresh = () => void queryClient.invalidateQueries({ queryKey: qk.bookings.root });
  const complete = useMutation({
    mutationFn: (id: string) => bookingsApi.complete(id, new Date().toISOString()),
    onSuccess: () => {
      toast.success(t('meeting.ended'));
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });

  const book = () => {
    startDraft(defaultDraft());
    router.push('/rooms/book');
  };

  const selectDay = (key: DateKey) => {
    setSelectedDay(key);
    const index = sections.findIndex((s) => s.key === key);
    if (index >= 0) listRef.current?.scrollToLocation({ sectionIndex: index, itemIndex: 0, viewOffset: 40, animated: true });
  };

  const changeWeek = (start: DateKey) => {
    setWeekStart(start);
    // Keep the same weekday selected in the new week (today when it is inside).
    const offset = weekKeys(weekStart).indexOf(selectedDay);
    setSelectedDay(weekKeys(start).includes(today) ? today : weekKeys(start)[Math.max(0, offset)]);
  };

  const header = (
    <>
      <HeaderBar
        testID="my-meetings-header"
        title={t('myMeetings.title')}
        leading="none"
        right={<HeaderIconButton testID="my-meetings-book" variant="solid" icon={PlusIcon} label={t('myMeetings.book')} onPress={book} />}
      />
      <WeekStrip testID="my-meetings-week" weekStart={weekStart} onWeekChange={changeWeek} value={selectedDay} onChange={selectDay} today={today} bookings={all} />
      <HeaderSegmented
        testID="my-meetings-tabs"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: t('myMeetings.upcoming'), testID: 'my-meetings-tab-upcoming' },
          { value: 'past', label: t('myMeetings.past'), testID: 'my-meetings-tab-past' },
        ]}
      />
    </>
  );

  return (
    <ScreenShell header={header} scroll={false}>
      {query.isLoading ? (
        <View className="p-4">
          <ListSkeleton count={4} lines={3} />
        </View>
      ) : query.isError && !all.length ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: SHEET_PADDING.horizontal, paddingBottom: SHEET_PADDING.bottom }}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
          onScrollToIndexFailed={() => undefined}
          renderSectionHeader={({ section }) => <GroupTitle className="pb-3 pt-4">{section.title}</GroupTitle>}
          renderItem={({ item, index, section }) => (
            <MyMeetingItem
              booking={item}
              myId={me.data?.id}
              now={now}
              first={index === 0}
              last={index === section.data.length - 1}
              onPress={() => router.push({ pathname: '/rooms/bookings/[id]', params: { id: item.id } })}
              onExtend={() => setExtending(item)}
              onEnd={() =>
                Alert.alert(t('meeting.endNow'), t('meeting.endNowConfirm'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('meeting.endNow'), style: 'destructive', onPress: () => complete.mutate(item.id) },
                ])
              }
              endBusy={complete.isPending && complete.variables === item.id}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={CalendarDotsIcon}
              message={tab === 'upcoming' ? t('myMeetings.empty') : t('myMeetings.emptyPast')}
              actionLabel={tab === 'upcoming' ? t('myMeetings.book') : undefined}
              onAction={tab === 'upcoming' ? book : undefined}
            />
          }
        />
      )}
      <ExtendSheet booking={extending} onClose={() => setExtending(null)} />
    </ScreenShell>
  );
}
