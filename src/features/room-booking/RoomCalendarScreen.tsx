import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { useRoomMe } from '@/core/session/useMe';
import { sameId } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { addDays, atMinutes, formatKey, formatMinutes, formatTime, minutesOfDay, parseDateKey, parseTimeOfDay, toDateKey, todayKey, weekdayOf, type DateKey } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card, FloatingCard } from '@/shared/ui/Card';
import { DatePickerSheet } from '@/shared/ui/DatePickerSheet';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { Icon } from '@/shared/ui/Icon';
import { ArrowRightIcon, ChartGanttIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, DoorOpenIcon, HourglassIcon, MapPinIcon, SearchIcon, SlidersHorizontalIcon } from '@/shared/ui/icons';
import { HeaderSearch } from '@/shared/ui/HeaderSearch';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { onBlue, useHeaderColors } from '@/shared/ui/ScreenShell';
import { SelectSheet } from '@/shared/ui/SelectSheet';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { StatStrip } from '@/shared/ui/StatStrip';
import { BookingBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { RoomTimeline, type SlotSelection } from './components/RoomTimeline';
import { defaultDraft, useBookingDraft } from './draftStore';
import { useApprovalLevels, useCrossLevel, useDefaultAreaId, useDepartmentsWithRooms, useRooms, useSchedule } from './hooks';
import { bookingFrom, bookingTo, isRoomBusy, roomDayBlocks, type TimelineBlock } from './logic';
import { weekStartOf } from './myMeetings';
import { BookingStatus, type BookingDto, type RoomDto } from './types';
import { useAreaPicker } from './ui/AreaPicker';
import { DayStrip } from './ui/DayStrip';

type Mode = 'day' | 'week';

/** Durations offered by the quick-book chip, in minutes. */
const DURATIONS = [30, 60, 90, 120];

/** 3a: rooms × hours for one day (or the week as an agenda). Tap an empty slot to book it. */
export function RoomCalendarScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ date?: string }>();
  const me = useRoomMe();
  const now = useNow();
  const defaultAreaId = useDefaultAreaId();
  const [areaChoice, setAreaChoice] = useState<string | undefined>();
  const areaId = areaChoice ?? defaultAreaId;
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const today = todayKey(now);
  const [dateKey, setDateKey] = useState<DateKey>(params.date ?? today);
  const [mode, setMode] = useState<Mode>('day');
  const [search, setSearch] = useState<string | null>(null);
  const [picker, setPicker] = useState<'department' | 'date' | null>(null);
  const [selection, setSelection] = useState<SlotSelection | null>(null);
  const [cluster, setCluster] = useState<BookingDto[] | null>(null);
  const startDraft = useBookingDraft((s) => s.start);
  const area = useAreaPicker(areaId, (value) => {
    setAreaChoice(value);
    setDepartmentId(undefined);
    setSelection(null);
  }, 'rooms-area');

  const weekStart = weekStartOf(dateKey);
  const query = search?.trim() || undefined;
  const departments = useDepartmentsWithRooms(areaId);
  const rooms = useRooms(areaId, departmentId);
  const crossLevel = useCrossLevel();
  const levels = useApprovalLevels();
  // One query for the shown week: day grid, week agenda and the dots of the strip.
  const schedule = useSchedule({
    fromDate: atMinutes(weekStart, 0).toISOString(),
    toDate: atMinutes(addDays(weekStart, 7), 0).toISOString(),
    areaId,
    departmentId,
    search: query,
  });

  const roomList = rooms.data ?? [];
  const weekBookings = schedule.data ?? [];
  const dayBookings = weekBookings.filter((b) => toDateKey(bookingFrom(b) ?? new Date(0)) === dateKey);
  const busyDays = new Set(weekBookings.filter((b) => b.status === BookingStatus.Approved || b.status === BookingStatus.Waiting).map((b) => toDateKey(bookingFrom(b) ?? new Date(0))));

  // Grid spans the earliest opening to the latest closing (07–19 when unknown).
  const opens = roomList.map((r) => parseTimeOfDay(r.openedAt)).filter((m): m is number => m !== null);
  const closes = roomList.map((r) => parseTimeOfDay(r.closedAt)).filter((m): m is number => m !== null);
  const startHour = opens.length ? Math.floor(Math.min(...opens) / 60) : 7;
  const endHour = Math.max(startHour + 4, closes.length ? Math.ceil(Math.max(...closes) / 60) : 19);

  const blocksByRoom: Record<string, TimelineBlock[]> = {};
  roomList.forEach((room) => {
    blocksByRoom[room.id] = roomDayBlocks(dayBookings.filter((b) => sameId(b.roomId ?? b.room?.id, room.id)), dateKey);
  });

  const isToday = dateKey === today;
  const nowMin = minutesOfDay(now);
  const freeNow = roomList.filter((room) => {
    const open = parseTimeOfDay(room.openedAt) ?? 0;
    const close = parseTimeOfDay(room.closedAt) ?? 24 * 60;
    return nowMin >= open && nowMin < close && !isRoomBusy(blocksByRoom[room.id] ?? [], nowMin);
  }).length;
  const pendingCount = dayBookings.filter((b) => b.status === BookingStatus.Waiting).length;

  // Confidential meetings show "Cuộc họp" to anyone not involved.
  const visibleTitle = (b: BookingDto) => {
    const related = sameId(b.user?.id, me.data?.id) || (b.participants ?? []).some((p) => sameId(p.userId, me.data?.id));
    return b.isConfidentialContent && !related ? t('meeting.confidentialHidden') : (b.content ?? b.code ?? '');
  };

  const selectDay = (key: DateKey) => {
    setDateKey(key);
    setSelection(null);
  };
  const shift = (direction: 1 | -1) => selectDay(addDays(dateKey, direction * (mode === 'week' ? 7 : 1)));

  const takenBlocks = (room: RoomDto) =>
    // Waiting requests only block rooms that refuse overlapping bookings.
    (blocksByRoom[room.id] ?? []).filter((b) => b.kind === 'approved' || b.kind === 'finished' || (!!room.isDisableOverlappingTimes && (b.kind === 'pending' || b.kind === 'cluster')));

  /** Longest end ≤ start + `minutes` before the room closes or the next taken block. */
  const endFor = (room: RoomDto, start: number, minutes: number) => {
    const close = parseTimeOfDay(room.closedAt) ?? 24 * 60;
    const nextStart = Math.min(...takenBlocks(room).filter((b) => b.startMin > start).map((b) => b.startMin), Infinity);
    return Math.min(start + minutes, close, nextStart);
  };

  const onPressSlot = (room: RoomDto, minute: number) => {
    const open = parseTimeOfDay(room.openedAt) ?? 0;
    const close = parseTimeOfDay(room.closedAt) ?? 24 * 60;
    if (minute < open || minute + 30 > close) {
      toast.info(t('rooms.outsideHours', { open: formatMinutes(open), close: formatMinutes(close) }));
      return;
    }
    if (dateKey < today || (isToday && minute + 30 <= nowMin)) {
      toast.info(t('booking.timeInPast'));
      return;
    }
    if (takenBlocks(room).some((b) => minute >= b.startMin && minute < b.endMin)) {
      toast.info(t('rooms.slotTaken'));
      return;
    }
    const end = endFor(room, minute, 60);
    if (end - minute < 15) {
      toast.info(t('rooms.slotTaken'));
      return;
    }
    setSelection((current) => (current && sameId(current.roomId, room.id) && current.startMin === minute ? null : { roomId: room.id, startMin: minute, endMin: end }));
  };

  const onPressBlock = (block: TimelineBlock) => {
    if (block.bookings.length > 1) setCluster(block.bookings);
    else router.push({ pathname: '/rooms/bookings/[id]', params: { id: block.bookings[0].id } });
  };

  const selectedRoom = selection ? roomList.find((r) => sameId(r.id, selection.roomId)) : undefined;

  /** Next duration that still fits (30 → 60 → 90 → 120 → 30). */
  const cycleDuration = () => {
    if (!selection || !selectedRoom) return;
    const current = selection.endMin - selection.startMin;
    const options = DURATIONS.map((d) => endFor(selectedRoom, selection.startMin, d) - selection.startMin).filter((d, i, all) => all.indexOf(d) === i);
    const next = options.find((d) => d > current) ?? options[0];
    setSelection({ ...selection, endMin: selection.startMin + next });
  };

  /** Book the selected slot: the wizard opens at B3 with room and time filled in. */
  const quickBook = () => {
    if (!selection) return;
    startDraft({
      ...defaultDraft(),
      areaId,
      dateKey,
      untilKey: addDays(dateKey, 28),
      startMin: selection.startMin,
      endMin: selection.endMin,
      roomId: selection.roomId,
      people: Math.min(selectedRoom?.numberOfSeats ?? 2, 2),
    });
    setSelection(null);
    router.push('/rooms/book/details');
  };

  const header = (
    <ModuleHeader
      testID="rooms-header"
      icon={ChartGanttIcon}
      title={t('rooms.calendarTitle')}
      subtitle={area.name}
      subtitleIcon={MapPinIcon}
      onSubtitlePress={area.open}
      right={
        <>
          <HeaderIconButton testID="rooms-search" icon={SearchIcon} label={t('common.search')} onPress={() => setSearch((s) => (s === null ? '' : null))} />
          <HeaderIconButton testID="rooms-department" icon={SlidersHorizontalIcon} label={t('booking.filterDepartment')} onPress={() => setPicker('department')}>
            {departmentId ? <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" /> : null}
          </HeaderIconButton>
        </>
      }
    >
      {search !== null ? <HeaderSearch testID="rooms-search-input" value={search} onChange={setSearch} onClose={() => setSearch(null)} placeholder={t('rooms.searchPlaceholder')} /> : null}
      <TodayRow
        dateKey={dateKey}
        today={today}
        mode={mode}
        onMode={(m) => {
          setMode(m);
          setSelection(null);
        }}
        onShift={shift}
        onPickDate={() => setPicker('date')}
      />
      <DayStrip testID="rooms-day" value={dateKey} onChange={selectDay} start={weekStart} marked={busyDays} className="mt-3" />
    </ModuleHeader>
  );

  const floating = (
    <FloatingCard>
      <StatStrip
        items={[
          isToday
            ? { key: 'free', icon: DoorOpenIcon, tone: 'ok', value: `${freeNow}/${roomList.length}`, label: t('rooms.statFree') }
            : { key: 'rooms', icon: DoorOpenIcon, tone: 'ok', value: roomList.length, label: t('rooms.statRooms') },
          { key: 'pending', icon: HourglassIcon, tone: 'wait', value: pendingCount, label: t('rooms.statPending') },
          isToday
            ? { key: 'now', icon: ClockIcon, tone: 'danger', value: formatMinutes(nowMin), label: t('rooms.statNow'), emphasize: true }
            : { key: 'bookings', icon: ClockIcon, tone: 'off', value: dayBookings.length, label: t('rooms.statBookings') },
        ]}
      />
    </FloatingCard>
  );

  const footer =
    selection && selectedRoom ? (
      <>
        <RoundIcon icon={DoorOpenIcon} size={44} square />
        <View className="min-w-0 flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text weight="bold" numberOfLines={1} className="flex-shrink text-ink" style={{ fontSize: 15, lineHeight: 20 }}>
              {selectedRoom.name}
            </Text>
            <Pressable testID="rooms-duration" accessibilityRole="button" onPress={cycleDuration} hitSlop={6} className="h-[22px] justify-center rounded-full bg-primary-tint px-2 active:opacity-70">
              <Text weight="bold" className="text-primary" style={{ fontSize: 11, lineHeight: 14 }}>
                {t('rooms.duration', { count: selection.endMin - selection.startMin })}
              </Text>
            </Pressable>
          </View>
          <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
            <Text mono style={{ fontSize: 12 }}>{`${formatMinutes(selection.startMin)} - ${formatMinutes(selection.endMin)}`}</Text>
            {selectedRoom.numberOfSeats ? ` · ${t('rooms.seats', { seats: selectedRoom.numberOfSeats })}` : ''}
            {levels(selectedRoom.id) === 0 ? ` · ${t('booking.tagNoApproval')}` : ''}
          </Text>
        </View>
        <Button testID="rooms-quickbook" label={t('rooms.book')} onPress={quickBook} trailing={<Icon icon={ArrowRightIcon} size={16} weight="bold" color="on-primary" />} />
      </>
    ) : undefined;

  const body =
    rooms.isLoading ? (
      <Card className="gap-3 p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height={52} radius={10} />
        ))}
      </Card>
    ) : rooms.isError ? (
      <ErrorState error={rooms.error} onRetry={() => void rooms.refetch()} />
    ) : roomList.length === 0 ? (
      <EmptyState icon={DoorOpenIcon} message={t('rooms.noRooms')} />
    ) : mode === 'week' ? (
      <WeekAgenda weekStart={weekStart} bookings={weekBookings} rooms={roomList} title={visibleTitle} onOpen={(b) => router.push({ pathname: '/rooms/bookings/[id]', params: { id: b.id } })} />
    ) : (
      <Card className="flex-1 overflow-hidden" style={{ borderRadius: 22 }}>
        {schedule.isError ? <ErrorState compact error={schedule.error} onRetry={() => void schedule.refetch()} /> : null}
        <RoomTimeline
          rooms={roomList}
          blocksByRoom={blocksByRoom}
          crossLevel={crossLevel}
          dateKey={dateKey}
          startHour={startHour}
          endHour={endHour}
          selection={selection}
          blockTitle={(block) => visibleTitle(block.bookings[0])}
          onPressBlock={onPressBlock}
          onPressSlot={onPressSlot}
        />
      </Card>
    );

  return (
    <ModuleScreen header={header} floating={floating} footer={footer} scroll={false}>
      {mode === 'week' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12, gap: 12 }}>{body}</ScrollView>
      ) : (
        <View className="flex-1 px-4 pb-3 pt-3">{body}</View>
      )}

      {area.sheet}
      <SelectSheet
        visible={picker === 'department'}
        onClose={() => setPicker(null)}
        title={t('booking.filterDepartment')}
        value={departmentId ?? ''}
        options={[{ value: '', label: t('rooms.allDepartmentsOption') }, ...(departments.data ?? []).map((d) => ({ value: d.id, label: d.name ?? d.code ?? '' }))]}
        onSelect={(value) => {
          setDepartmentId(value || undefined);
          setSelection(null);
        }}
      />
      <DatePickerSheet visible={picker === 'date'} onClose={() => setPicker(null)} title={t('rooms.chooseDate')} value={dateKey} onSelect={selectDay} />

      <BottomSheet visible={!!cluster} onClose={() => setCluster(null)} title={t('rooms.clusterTitle')} scrollable>
        {(cluster ?? []).map((b) => (
          <BookingRow
            key={b.id}
            booking={b}
            title={visibleTitle(b)}
            onPress={() => {
              setCluster(null);
              router.push({ pathname: '/rooms/bookings/[id]', params: { id: b.id } });
            }}
          />
        ))}
      </BottomSheet>
    </ModuleScreen>
  );
}

/** "THÁNG 10 · 2026 ⌄" over "Hôm nay [T2 05/10]" (or the weekday), with ‹ › and the Ngày / Tuần switch. */
function TodayRow({ dateKey, today, mode, onMode, onShift, onPickDate }: { dateKey: DateKey; today: DateKey; mode: Mode; onMode: (m: Mode) => void; onShift: (d: 1 | -1) => void; onPickDate: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fg, text3 } = useHeaderColors();
  const { month, year } = parseDateKey(dateKey);
  const weekday = weekdayOf(dateKey);
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="min-w-0 flex-shrink">
        <Pressable testID="rooms-date" accessibilityRole="button" accessibilityLabel={t('rooms.chooseDate')} onPress={onPickDate} hitSlop={8} className="flex-row items-center gap-1 active:opacity-70">
          <Text weight="semibold" style={{ fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase', color: text3 }}>
            {t('rooms.monthYear', { month, year })}
          </Text>
          <Icon icon={ChevronDownIcon} size={12} weight="bold" rawColor={text3} />
        </Pressable>
        <View className="mt-1 flex-row items-center gap-2">
          <Text weight="bold" numberOfLines={1} className="flex-shrink" style={{ fontSize: 19, lineHeight: 24, color: fg }}>
            {dateKey === today ? t('rooms.today') : t(`time.weekday.${String(weekday) as '0'}`)}
          </Text>
          <View className="h-[22px] justify-center rounded-[7px] px-1.5" style={{ backgroundColor: onBlue(0.14) }}>
            <Text mono weight="semibold" style={{ fontSize: 11.5, lineHeight: 14, color: fg }}>
              {`${t(`time.weekdayShort.${String(weekday) as '0'}`)} ${formatKey(dateKey, false)}`}
            </Text>
          </View>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="h-9 flex-row items-center rounded-[10px]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.14)' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('rooms.previousDay')} onPress={() => onShift(-1)} className="h-9 w-9 items-center justify-center active:opacity-60">
            <Icon icon={ChevronLeftIcon} size={16} weight="bold" rawColor={fg} />
          </Pressable>
          <View className="h-4 w-px" style={{ backgroundColor: onBlue(0.25) }} />
          <Pressable accessibilityRole="button" accessibilityLabel={t('rooms.nextDay')} onPress={() => onShift(1)} className="h-9 w-9 items-center justify-center active:opacity-60">
            <Icon icon={ChevronRightIcon} size={16} weight="bold" rawColor={fg} />
          </Pressable>
        </View>
        <View className="h-9 flex-row rounded-[10px] p-[3px]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.14)' }}>
          {(['day', 'week'] as const).map((m) => {
            const active = m === mode;
            return (
              <Pressable
                key={m}
                testID={`rooms-mode-${m}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => onMode(m)}
                className="justify-center rounded-[8px] px-3 active:opacity-80"
                style={{ backgroundColor: active ? fg : 'transparent' }}
              >
                <Text weight="bold" style={{ fontSize: 12.5, lineHeight: 16, color: active ? colors.primary : colors['header-text-soft'] }}>
                  {m === 'day' ? t('rooms.dayMode') : t('rooms.weekMode')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Week mode: each day of the shown week with its bookings in time order. */
function WeekAgenda({ weekStart, bookings, rooms, title, onOpen }: { weekStart: DateKey; bookings: BookingDto[]; rooms: RoomDto[]; title: (b: BookingDto) => string; onOpen: (b: BookingDto) => void }) {
  const { t } = useTranslation();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const roomIds = new Set(rooms.map((r) => r.id.toLowerCase()));
  return (
    <>
      {days.map((day) => {
        const items = bookings
          .filter((b) => toDateKey(bookingFrom(b) ?? new Date(0)) === day && roomIds.has(String(b.roomId ?? b.room?.id ?? '').toLowerCase()))
          .sort((a, b) => (a.from ?? '').localeCompare(b.from ?? ''));
        return (
          <Card key={day} className="gap-1 p-3.5">
            <View className="flex-row items-center justify-between pb-1">
              <Text weight="bold" style={{ fontSize: 14, lineHeight: 19 }}>
                {`${t(`time.weekday.${String(weekdayOf(day)) as '0'}`)} · ${formatKey(day, false)}`}
              </Text>
              <Text className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
                {items.length ? t('rooms.dayBookings', { count: items.length }) : t('rooms.noBookingsDay')}
              </Text>
            </View>
            {items.map((b, i) => (
              <BookingRow key={b.id} booking={b} title={title(b)} divider={i > 0} onPress={() => onOpen(b)} />
            ))}
          </Card>
        );
      })}
    </>
  );
}

function BookingRow({ booking, title, divider, onPress }: { booking: BookingDto; title: string; divider?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className={`min-h-[52px] flex-row items-center gap-3 py-2 active:opacity-70 ${divider ? 'border-t border-line-2' : ''}`}>
      <View style={{ width: 44 }}>
        <Text mono weight="bold" className="text-ink" style={{ fontSize: 12.5, lineHeight: 16 }}>
          {formatTime(bookingFrom(booking))}
        </Text>
        <Text mono className="text-subtle" style={{ fontSize: 11, lineHeight: 14 }}>
          {formatTime(bookingTo(booking))}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text weight="semibold" numberOfLines={1} className="text-ink" style={{ fontSize: 13.5, lineHeight: 18 }}>
          {title}
        </Text>
        <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
          {[booking.room?.name, booking.user?.fullname].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <BookingBadge status={booking.status ?? 1} />
    </Pressable>
  );
}
