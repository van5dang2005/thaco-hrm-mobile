import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoomMe } from '@/core/session/useMe';
import { sameId } from '@/core/session/userTypes';
import { addDays, atMinutes, formatMinutes, formatTime, minutesOfDay, parseTimeOfDay, todayKey, type DateKey } from '@/core/time/vn';
import { Button } from '@/shared/ui/Button';
import { DatePickerSheet } from '@/shared/ui/DatePickerSheet';
import { HeaderBar, HeaderIconButton } from '@/shared/ui/HeaderBar';
import { CalendarDotsIcon, DoorOpenIcon, FunnelSimpleIcon } from '@/shared/ui/icons';
import { SelectSheet } from '@/shared/ui/SelectSheet';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { ScreenShell, useHeaderColors } from '@/shared/ui/ScreenShell';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { BookingBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { RoomTimeline, type SlotSelection } from './components/RoomTimeline';
import { defaultDraft, useBookingDraft } from './draftStore';
import { useApprovalLevels, useCrossLevel, useDefaultAreaId, useDepartmentsWithRooms, useRooms, useSchedule } from './hooks';
import { bookingFrom, bookingTo, roomDayBlocks, type TimelineBlock } from './logic';
import type { BookingDto, RoomDto } from './types';
import { AreaPicker } from './ui/AreaPicker';
import { DayStrip } from './ui/DayStrip';
import { useRoomMeta } from './wizard/RoomStep';

/** 3a: rooms × hours for one day. Tap an empty slot for "Đặt nhanh". */
export function RoomCalendarScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const headerColors = useHeaderColors();
  const params = useLocalSearchParams<{ date?: string }>();
  const me = useRoomMe();
  const roomMeta = useRoomMeta();
  const defaultAreaId = useDefaultAreaId();
  const [areaChoice, setAreaChoice] = useState<string | undefined>();
  const areaId = areaChoice ?? defaultAreaId;
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const today = todayKey();
  const [dateKey, setDateKey] = useState<DateKey>(params.date ?? today);
  const [picker, setPicker] = useState<'department' | 'date' | null>(null);
  const [selection, setSelection] = useState<SlotSelection | null>(null);
  const [cluster, setCluster] = useState<BookingDto[] | null>(null);
  const startDraft = useBookingDraft((s) => s.start);

  const departments = useDepartmentsWithRooms(areaId);
  const rooms = useRooms(areaId, departmentId);
  const crossLevel = useCrossLevel();
  const levels = useApprovalLevels();
  const schedule = useSchedule({
    fromDate: atMinutes(dateKey, 0).toISOString(),
    toDate: atMinutes(addDays(dateKey, 1), 0).toISOString(),
    areaId,
    departmentId,
  });

  const roomList = rooms.data ?? [];

  // Grid spans the earliest opening to the latest closing (07–19 when unknown).
  const opens = roomList.map((r) => parseTimeOfDay(r.openedAt)).filter((m): m is number => m !== null);
  const closes = roomList.map((r) => parseTimeOfDay(r.closedAt)).filter((m): m is number => m !== null);
  const startHour = opens.length ? Math.floor(Math.min(...opens) / 60) : 7;
  const endHour = Math.max(startHour + 4, closes.length ? Math.ceil(Math.max(...closes) / 60) : 19);

  const blocksByRoom: Record<string, TimelineBlock[]> = {};
  roomList.forEach((room) => {
    blocksByRoom[room.id] = roomDayBlocks((schedule.data ?? []).filter((b) => sameId(b.roomId ?? b.room?.id, room.id)), dateKey);
  });

  // Confidential meetings show "Cuộc họp" to anyone not involved.
  const visibleTitle = (b: BookingDto) => {
    const related = sameId(b.user?.id, me.data?.id) || (b.participants ?? []).some((p) => sameId(p.userId, me.data?.id));
    return b.isConfidentialContent && !related ? t('meeting.confidentialHidden') : (b.content ?? b.code ?? '');
  };

  // The strip starts today; a date picked outside the next 7 days starts the strip on that date.
  const stripStart = dateKey < today || dateKey > addDays(today, 6) ? dateKey : today;

  const selectDay = (key: DateKey) => {
    setDateKey(key);
    setSelection(null);
  };

  const onPressSlot = (room: RoomDto, minute: number) => {
    const open = parseTimeOfDay(room.openedAt) ?? 0;
    const close = parseTimeOfDay(room.closedAt) ?? 24 * 60;
    if (minute < open || minute + 30 > close) {
      toast.info(t('rooms.outsideHours', { open: formatMinutes(open), close: formatMinutes(close) }));
      return;
    }
    if (dateKey < today || (dateKey === today && minute + 30 <= minutesOfDay(new Date()))) {
      toast.info(t('booking.timeInPast'));
      return;
    }
    // Waiting requests only block rooms that refuse overlapping bookings.
    const taken = (blocksByRoom[room.id] ?? []).filter(
      (b) => b.kind === 'approved' || b.kind === 'finished' || (!!room.isDisableOverlappingTimes && (b.kind === 'pending' || b.kind === 'cluster')),
    );
    if (taken.some((b) => minute >= b.startMin && minute < b.endMin)) {
      toast.info(t('rooms.slotTaken'));
      return;
    }
    const nextStart = Math.min(...taken.filter((b) => b.startMin > minute).map((b) => b.startMin), Infinity);
    const end = Math.min(minute + 60, close, nextStart);
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

  /** "Đặt nhanh": jump straight to B3 with room and time filled in. */
  const quickBook = () => {
    if (!selection) return;
    const room = roomList.find((r) => sameId(r.id, selection.roomId));
    startDraft({
      ...defaultDraft(),
      areaId,
      dateKey,
      untilKey: addDays(dateKey, 28),
      startMin: selection.startMin,
      endMin: selection.endMin,
      roomId: selection.roomId,
      people: Math.min(room?.numberOfSeats ?? 2, 2),
    });
    setSelection(null);
    router.push('/rooms/book/details');
  };

  const selectedRoom = selection ? roomList.find((r) => sameId(r.id, selection.roomId)) : undefined;
  const selectedLevels = selectedRoom ? levels(selectedRoom.id) : null;

  const header = (
    <>
      <HeaderBar
        testID="rooms-header"
        title={t('rooms.calendarTitle')}
        right={
          <>
            <HeaderIconButton testID="rooms-date" icon={CalendarDotsIcon} label={t('rooms.chooseDate')} onPress={() => setPicker('date')} />
            <HeaderIconButton testID="rooms-department" icon={FunnelSimpleIcon} label={t('booking.filterDepartment')} onPress={() => setPicker('department')}>
              {departmentId ? <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" /> : null}
            </HeaderIconButton>
          </>
        }
      />
      <AreaPicker
        testID="rooms-area"
        areaId={areaId}
        onChange={(value) => {
          setAreaChoice(value);
          setDepartmentId(undefined);
          setSelection(null);
        }}
        right={
          rooms.data ? (
            <Text numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, color: headerColors.sub }}>
              {t('booking.roomsCount', { count: roomList.length })}
            </Text>
          ) : null
        }
      />
      <DayStrip testID="rooms-day" value={dateKey} onChange={selectDay} start={stripStart} />
    </>
  );

  return (
    <ScreenShell header={header} sheetBg="surface" scroll={false} headerBottom={16}>
      <View className="flex-row items-center gap-3.5 px-4 pb-1 pt-4">
        <View className="flex-row items-center gap-[5px]">
          <View className="h-2.5 w-2.5 rounded-[3px] bg-approved-block" />
          <Text className="text-muted" style={{ fontSize: 11, lineHeight: 14 }}>{t('rooms.legendApproved')}</Text>
        </View>
        <View className="flex-row items-center gap-[5px]">
          <View className="h-2.5 w-2.5 rounded-[3px] border-[1.5px] border-dashed border-primary bg-primary-tint" />
          <Text className="text-muted" style={{ fontSize: 11, lineHeight: 14 }}>{t('rooms.legendPending')}</Text>
        </View>
        <Text numberOfLines={1} className="ml-auto flex-shrink text-muted" style={{ fontSize: 11, lineHeight: 14 }}>
          {t('rooms.tapToBook')}
        </Text>
      </View>

      {rooms.isLoading ? (
        <View className="gap-3 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} height={52} radius={10} />
          ))}
        </View>
      ) : rooms.isError ? (
        <ErrorState error={rooms.error} onRetry={() => void rooms.refetch()} />
      ) : roomList.length === 0 ? (
        <EmptyState icon={DoorOpenIcon} message={t('rooms.noRooms')} />
      ) : (
        <>
          {schedule.isError ? <ErrorState compact error={schedule.error} onRetry={() => void schedule.refetch()} /> : null}
          <RoomTimeline
            rooms={roomList}
            blocksByRoom={blocksByRoom}
            crossLevel={crossLevel}
            roomMeta={roomMeta}
            dateKey={dateKey}
            startHour={startHour}
            endHour={endHour}
            selection={selection}
            blockTitle={(block) => visibleTitle(block.bookings[0])}
            onPressBlock={onPressBlock}
            onPressSlot={onPressSlot}
            bottomInset={selection ? 120 : 40}
          />
        </>
      )}

      {selection && selectedRoom ? (
        <View
          testID="rooms-quickbar"
          className="absolute left-4 right-4 flex-row items-center gap-3 rounded-[18px] py-3 pl-4 pr-3"
          style={{ bottom: Math.max(insets.bottom, 16) + 8, backgroundColor: '#0F1B2D', boxShadow: '0px 10px 30px rgba(15, 27, 45, 0.25)' }}
        >
          <View className="flex-1 gap-0.5">
            <Text weight="semibold" className="text-body text-white" numberOfLines={1}>
              {`${selectedRoom.name} · `}
              <Text mono weight="semibold" className="text-body text-white">{`${formatMinutes(selection.startMin)}–${formatMinutes(selection.endMin)}`}</Text>
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 15, color: '#9FB0C4' }}>
              {[
                selectedRoom.numberOfSeats ? t('rooms.seats', { seats: selectedRoom.numberOfSeats }) : null,
                selectedLevels === null ? t('booking.quickUnknown') : selectedLevels === 0 ? t('booking.quickNoApproval') : t('booking.quickLevels', { count: selectedLevels }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Button testID="rooms-quickbook" size="sm" variant="inverse" label={t('rooms.quickBook')} onPress={quickBook} className="px-4" />
        </View>
      ) : null}

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
          <Pressable
            key={b.id}
            accessibilityRole="button"
            onPress={() => {
              setCluster(null);
              router.push({ pathname: '/rooms/bookings/[id]', params: { id: b.id } });
            }}
            className="gap-1.5 rounded-card border border-line p-3.5 active:opacity-80"
          >
            <View className="flex-row items-start justify-between gap-2">
              <Text weight="semibold" className="flex-1 text-card" numberOfLines={2}>
                {visibleTitle(b)}
              </Text>
              <BookingBadge status={b.status ?? 1} />
            </View>
            <Text className="text-sub-sm text-ink-2">
              <Text mono weight="semibold" className="text-sub-sm">{`${formatTime(bookingFrom(b))}–${formatTime(bookingTo(b))}`}</Text>
              {` · ${b.user?.fullname ?? ''}`}
            </Text>
          </Pressable>
        ))}
      </BottomSheet>
    </ScreenShell>
  );
}
