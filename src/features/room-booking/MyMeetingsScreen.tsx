import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, SectionList, View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { useRoomMe } from '@/core/session/useMe';
import { addDays, atMinutes, formatKey, parseDateKey, todayKey, toDateKey, weekdayOf, type DateKey } from '@/core/time/vn';
import { groupByDay } from '@/features/approval/logic';
import { useNow } from '@/shared/hooks/useNow';
import { FloatingCard } from '@/shared/ui/Card';
import { CardSegmented } from '@/shared/ui/CardSegmented';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { HeaderSearch } from '@/shared/ui/HeaderSearch';
import { CalendarDaysIcon, PlusIcon, SearchIcon, CalendarCheckIcon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { CONTENT_PADDING, ModuleScreen } from '@/shared/ui/ModuleScreen';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { bookingsApi } from './api';
import { ExtendSheet } from './components/ExtendSheet';
import { MyMeetingItem } from './components/MyMeetingItem';
import { defaultDraft, useBookingDraft } from './draftStore';
import { bookingFrom } from './logic';
import { isUpcoming, weekKeys, weekStartOf } from './myMeetings';
import { BookingStatus, type BookingDto } from './types';
import { WeekStrip } from './ui/WeekStrip';

type Tab = 'upcoming' | 'waiting' | 'past';
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
  const [search, setSearch] = useState<string | null>(null);
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
  const keyword = search?.trim().toLowerCase() ?? '';
  const inWeek = all.filter((b) => {
    const from = bookingFrom(b);
    return !!from && days.has(toDateKey(from)) && (!keyword || (b.content ?? '').toLowerCase().includes(keyword) || (b.code ?? '').toLowerCase().includes(keyword));
  });
  const inTab = (b: BookingDto, which: Tab) =>
    which === 'past' ? !isUpcoming(b, now) : which === 'waiting' ? isUpcoming(b, now) && b.status === BookingStatus.Waiting : isUpcoming(b, now);
  const counts = { upcoming: inWeek.filter((b) => inTab(b, 'upcoming')).length, waiting: inWeek.filter((b) => inTab(b, 'waiting')).length };
  const items = inWeek.filter((b) => inTab(b, tab)).sort((a, b) => (tab === 'past' ? -1 : 1) * (a.from ?? '').localeCompare(b.from ?? ''));
  const sections = groupByDay(items, (b) => toDateKey(bookingFrom(b) ?? now)).map((g) => ({ key: g.key, data: g.data }));
  const weekMeetings = all.filter((b) => days.has(toDateKey(bookingFrom(b) ?? new Date(0))) && b.status !== BookingStatus.Canceled && b.status !== BookingStatus.Rejected).length;

  /** "1/5" for a booking of a series, from the sessions loaded in the window. */
  const seriesOf = (b: BookingDto) => {
    if (!b.groupId) return null;
    const sessions = all.filter((x) => x.groupId === b.groupId).sort((x, y) => (x.from ?? '').localeCompare(y.from ?? ''));
    return sessions.length > 1 ? { index: sessions.findIndex((x) => x.id === b.id) + 1, total: sessions.length } : null;
  };

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

  const { month, year } = parseDateKey(selectedDay);
  const header = (
    <ModuleHeader
      testID="my-meetings-header"
      icon={CalendarCheckIcon}
      title={t('myMeetings.title')}
      titleSize="lg"
      subtitle={t('myMeetings.subtitle', { month, year, count: weekMeetings })}
      leading="none"
      right={
        <>
          <HeaderIconButton testID="my-meetings-search" icon={SearchIcon} label={t('common.search')} onPress={() => setSearch((v) => (v === null ? '' : null))} />
          <HeaderIconButton testID="my-meetings-book" variant="solid" icon={PlusIcon} label={t('myMeetings.book')} onPress={book} />
        </>
      }
    >
      {search !== null ? <HeaderSearch testID="my-meetings-search-input" value={search} onChange={setSearch} onClose={() => setSearch(null)} placeholder={t('myMeetings.searchPlaceholder')} /> : null}
      <WeekStrip testID="my-meetings-week" weekStart={weekStart} onWeekChange={changeWeek} value={selectedDay} onChange={selectDay} today={today} bookings={all} />
    </ModuleHeader>
  );

  const floating = (
    <FloatingCard>
      <CardSegmented
        testID="my-meetings-tabs"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: t('myMeetings.tabCount', { label: t('myMeetings.upcoming'), count: counts.upcoming }), testID: 'my-meetings-tab-upcoming' },
          { value: 'waiting', label: t('myMeetings.tabCount', { label: t('myMeetings.waitingTab'), count: counts.waiting }), testID: 'my-meetings-tab-waiting' },
          { value: 'past', label: t('myMeetings.past'), testID: 'my-meetings-tab-past' },
        ]}
      />
    </FloatingCard>
  );

  return (
    <ModuleScreen header={header} floating={floating} scroll={false}>
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
          contentContainerStyle={{ paddingHorizontal: CONTENT_PADDING.horizontal, paddingBottom: CONTENT_PADDING.bottom }}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
          onScrollToIndexFailed={() => undefined}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderSectionHeader={({ section }) => <DayHeader dayKey={section.key as DateKey} today={today} count={section.data.length} />}
          renderItem={({ item }) => (
            <MyMeetingItem
              booking={item}
              myId={me.data?.id}
              now={now}
              series={seriesOf(item)}
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
              icon={CalendarDaysIcon}
              message={tab === 'past' ? t('myMeetings.emptyPast') : t('myMeetings.empty')}
              actionLabel={tab === 'past' ? undefined : t('myMeetings.book')}
              onAction={tab === 'past' ? undefined : book}
            />
          }
        />
      )}
      <ExtendSheet booking={extending} onClose={() => setExtending(null)} />
    </ModuleScreen>
  );
}

/** "HÔM NAY · THỨ HAI 05/10" / "THỨ BA · 06/10" with the meeting count on the right. */
function DayHeader({ dayKey, today, count }: { dayKey: DateKey; today: DateKey; count: number }) {
  const { t } = useTranslation();
  const weekday = t(`time.weekday.${String(weekdayOf(dayKey)) as '0'}`);
  const date = formatKey(dayKey, false);
  const title = dayKey === today ? `${t('myMeetings.today')} · ${weekday} ${date}` : dayKey === addDays(today, 1) ? `${t('myMeetings.tomorrow')} · ${weekday} ${date}` : `${weekday} · ${date}`;
  return (
    <View className="flex-row items-center justify-between px-1 pb-2.5 pt-4">
      <Text weight="bold" numberOfLines={1} className="flex-shrink text-muted" style={{ fontSize: 11.5, lineHeight: 15, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {title}
      </Text>
      <Text className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
        {t('myMeetings.dayCount', { count })}
      </Text>
    </View>
  );
}
