import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { sameId } from '@/core/session/userTypes';
import { addDays, atMinutes, diffDays, formatKey, formatMinutes, minutesOfDay, parseTimeOfDay, todayKey, weekdayOf, type DateKey } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Card, PressableCard } from '@/shared/ui/Card';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { Icon } from '@/shared/ui/Icon';
import { CalendarIcon, CheckIcon, ChevronRightIcon, DoorOpenIcon, LockIcon, SquareCheckBigIcon } from '@/shared/ui/icons';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import { blockingBusy, busyFromBlocks, roomNow, type Busy, type RoomNow } from '../availability';
import { useBookingDraft } from '../draftStore';
import { useApprovalLevels, useCrossLevel, useDefaultAreaId, useRooms, useSchedule } from '../hooks';
import { roomDayBlocks } from '../logic';
import type { RoomDto } from '../types';
import { AvailabilityBar } from '../ui/AvailabilityBar';
import { WizardHeader } from '../ui/WizardHeader';
import { DayStrip } from '../ui/DayStrip';
import { isOnlineService, serviceIcon } from '../ui/serviceIcon';
import { useMyMeetingDays } from '../wizardData';
import { useLeaveWizard } from './navigation';

type Filter = 'all' | 'free' | 'seats' | 'online';
const SEATS_FILTER = 8;

type RoomCard = {
  room: RoomDto;
  busy: Busy[];
  blocking: Busy[];
  open: number;
  close: number;
  /** Today only: free / in use / closed right now. */
  now: RoomNow | null;
  locked?: 'crossLevel' | 'advance';
};

/** Room seats line: "12 chỗ · Tầng 3" (code2 / code carries the floor or building). */
export function useRoomMeta() {
  const { t } = useTranslation();
  return (room: RoomDto) => {
    const extra = room.code2 ?? room.code;
    return extra ? t('rooms.seatsWith', { seats: room.numberOfSeats ?? 0, extra }) : t('rooms.seats', { seats: room.numberOfSeats ?? 0 });
  };
}

/** Latest day bookable in every room of the list, or undefined when some room has no limit. */
export function maxBookableDay(rooms: RoomDto[], today: DateKey): DateKey | undefined {
  if (!rooms.length) return undefined;
  const limits = rooms.map((r) => (r.isDayLimited && r.maxAdvanceRegistrationDays != null ? r.maxAdvanceRegistrationDays : null));
  if (limits.some((l) => l === null)) return undefined;
  return addDays(today, Math.max(...(limits as number[])));
}

/** B1 (4a): pick a room for the chosen day. */
export function RoomStep() {
  const { t } = useTranslation();
  const draft = useBookingDraft((s) => s.draft);
  const patch = useBookingDraft((s) => s.patch);
  const leave = useLeaveWizard();
  const defaultArea = useDefaultAreaId();
  const areaId = draft.areaId ?? defaultArea;
  const now = useNow();
  const today = todayKey(now);
  const dateKey = draft.dateKey < today ? today : draft.dateKey;
  const isToday = dateKey === today;
  const nowMin = minutesOfDay(now);
  const [filter, setFilter] = useState<Filter>('all');
  const marked = useMyMeetingDays(today);
  const roomMeta = useRoomMeta();

  const rooms = useRooms(areaId);
  const crossLevel = useCrossLevel();
  const levels = useApprovalLevels();
  const schedule = useSchedule({ fromDate: atMinutes(dateKey, 0).toISOString(), toDate: atMinutes(addDays(dateKey, 1), 0).toISOString(), areaId });

  const roomList = rooms.data ?? [];
  const editGroup = draft.mode === 'edit' ? draft.edit?.groupId : undefined;
  const bookings = (schedule.data ?? []).filter((b) => !(editGroup && sameId(b.groupId, editGroup)));

  const cards: RoomCard[] = roomList.map((room) => {
    const busy = busyFromBlocks(roomDayBlocks(bookings.filter((b) => sameId(b.roomId ?? b.room?.id, room.id)), dateKey));
    const blocking = blockingBusy(busy, !!room.isDisableOverlappingTimes);
    const open = parseTimeOfDay(room.openedAt) ?? 0;
    const close = parseTimeOfDay(room.closedAt) ?? 24 * 60;
    const beyondLimit = !!room.isDayLimited && room.maxAdvanceRegistrationDays != null && diffDays(today, dateKey) > room.maxAdvanceRegistrationDays;
    return {
      room,
      busy,
      blocking,
      open,
      close,
      now: isToday ? roomNow(blocking, open, close, nowMin) : null,
      locked: crossLevel(room) === 'blocked' ? 'crossLevel' : beyondLimit ? 'advance' : undefined,
    };
  });

  const bookable = cards.filter((c) => !c.locked);
  const locked = cards.filter((c) => c.locked);
  const hasOnline = bookable.some((c) => c.room.services?.some((s) => isOnlineService(s.name)));
  const isFree = (c: RoomCard) => (c.now ? c.now.kind === 'free' : c.blocking.length === 0);
  const shown = bookable.filter((c) => {
    switch (filter) {
      case 'free':
        return isFree(c);
      case 'seats':
        return (c.room.numberOfSeats ?? 0) >= SEATS_FILTER;
      case 'online':
        return !!c.room.services?.some((s) => isOnlineService(s.name));
      default:
        return true;
    }
  });

  const loaded = !rooms.isLoading && !schedule.isLoading;

  const choose = (room: RoomDto) => {
    const available = new Set((room.services ?? []).map((s) => s.id.toLowerCase()));
    patch({ roomId: room.id, serviceIds: draft.serviceIds.filter((id) => available.has(id.toLowerCase())) });
  };

  const changeDay = (key: DateKey) => patch({ dateKey: key, untilKey: draft.untilKey > key ? draft.untilKey : addDays(key, 28) });

  const selected = cards.find((c) => sameId(c.room.id, draft.roomId) && !c.locked);
  const pickTime = () => {
    if (!selected) return;
    if (areaId && areaId !== draft.areaId) patch({ areaId });
    if (dateKey !== draft.dateKey) changeDay(dateKey);
    router.push('/rooms/book/time');
  };

  const header = (
    <WizardHeader
      testID="booking-header"
      leading="close"
      step={1}
      onBack={leave}
      onAreaChange={(value) => patch({ areaId: value, roomId: undefined })}
      right={<HeaderIconButton testID="booking-my-calendar" icon={CalendarIcon} label={t('booking.myCalendar')} onPress={() => router.push('/calendar')} />}
      bottom={20}
    >
      <DayStrip testID="booking-day" value={dateKey} onChange={changeDay} start={today} maxKey={maxBookableDay(roomList, today)} marked={marked} />
    </WizardHeader>
  );

  const footer = (
    <>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
          {`${t(`time.weekdayShort.${String(weekdayOf(dateKey)) as '0'}`)}, ${formatKey(dateKey, false)}`}
        </Text>
        <Text weight="bold" numberOfLines={1} className="text-ink" style={{ fontSize: 15, lineHeight: 20 }}>
          {selected?.room.name ?? t('booking.noRoomSelected')}
        </Text>
      </View>
      <Button testID="booking-room-continue" label={t('booking.continueToTime')} disabled={!selected} onPress={pickTime} trailing={<Icon icon={ChevronRightIcon} size={16} weight="bold" color="on-primary" />} />
    </>
  );

  return (
    <ModuleScreen header={header} footer={footer} scroll={false}>
      {/* The chip row never shrinks; the list takes the rest of the screen and scrolls on its own. */}
      <View className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerClassName="items-center gap-2 px-4 pb-1 pt-3.5"
        >
          <FilterPill testID="booking-filter-all" label={t('booking.filterAll', { count: bookable.length })} selected={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterPill testID="booking-filter-free" label={isToday ? t('booking.filterFreeNow') : t('booking.filterFreeDay')} selected={filter === 'free'} onPress={() => setFilter('free')} />
          <FilterPill testID="booking-filter-seats" label={t('booking.filterSeats', { count: SEATS_FILTER })} selected={filter === 'seats'} onPress={() => setFilter('seats')} />
          {hasOnline ? <FilterPill testID="booking-filter-online" label={t('booking.filterOnline')} selected={filter === 'online'} onPress={() => setFilter('online')} /> : null}
        </ScrollView>

        <FlatList
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={schedule.isRefetching} onRefresh={() => void Promise.all([schedule.refetch(), rooms.refetch()])} />}
          data={loaded ? shown : []}
          keyExtractor={(card) => String(card.room.id)}
          renderItem={({ item: card, index }) => (
            <RoomCardView
              index={index}
              card={card}
              meta={roomMeta(card.room)}
              levels={levels(card.room.id)}
              selected={sameId(card.room.id, draft.roomId)}
              nowMin={isToday ? nowMin : null}
              onSelect={() => choose(card.room)}
            />
          )}
          ListHeaderComponent={
            rooms.isLoading || (schedule.isLoading && !!areaId) ? (
              <ListSkeleton count={3} lines={4} />
            ) : rooms.isError || schedule.isError ? (
              <ErrorState error={rooms.error ?? schedule.error} onRetry={() => void Promise.all([rooms.refetch(), schedule.refetch()])} />
            ) : roomList.length === 0 ? (
              <EmptyState icon={DoorOpenIcon} message={t('rooms.noRooms')} />
            ) : shown.length === 0 && bookable.length > 0 ? (
              <EmptyState message={t('booking.filterEmpty')} actionLabel={t('booking.filterAll', { count: bookable.length })} onAction={() => setFilter('all')} />
            ) : null
          }
          ListFooterComponent={
            locked.length && !rooms.isLoading ? (
              <View className="gap-2 pt-2" testID="booking-locked-rooms">
                <Text weight="semibold" numberOfLines={1} className="px-1 text-sub text-muted">
                  {t('booking.unavailableTitle')}
                </Text>
                {locked.map((card) => (
                  <Card key={card.room.id} className="flex-row items-center gap-3 p-4 opacity-60">
                    <RoundIcon icon={LockIcon} size={40} tone="off" square />
                    <View className="min-w-0 flex-1 gap-0.5">
                      <Text weight="bold" numberOfLines={1} style={{ fontSize: 15, lineHeight: 20 }}>
                        {card.room.name}
                      </Text>
                      <Text numberOfLines={2} className="text-meta text-muted">
                        {card.locked === 'crossLevel'
                          ? t('booking.reasonCrossLevel')
                          : t('booking.reasonAdvance', { days: card.room.maxAdvanceRegistrationDays ?? 0 })}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            ) : null
          }
        />
      </View>
    </ModuleScreen>
  );
}

/** Filter chip of 4a: ink fill when selected, white with a hairline otherwise. */
export function FilterPill({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn('h-[34px] shrink-0 justify-center rounded-full px-3.5 active:opacity-80', selected ? 'bg-inverse' : 'border border-line bg-elevated')}
    >
      <Text weight={selected ? 'bold' : 'medium'} numberOfLines={1} className={cn('text-sub', selected ? 'text-on-inverse' : 'text-ink')}>
        {label}
      </Text>
    </Pressable>
  );
}

/** "Trống → 09:30" (green) / "Đang họp" (amber) / "Ngoài giờ" (grey) / "2 lịch đã đặt". */
function StatusPill({ card }: { card: RoomCard }) {
  const { t } = useTranslation();
  if (card.now) {
    if (card.now.kind === 'free') return <StatusBadge kind="ok" label={t('booking.freeUntil', { time: formatMinutes(card.now.until) })} />;
    if (card.now.kind === 'busy') return <StatusBadge kind="warn" label={t('booking.busyUntil', { time: formatMinutes(card.now.until) })} />;
    return <StatusBadge kind="off" label={t('booking.closedNow')} />;
  }
  return card.blocking.length === 0 ? (
    <StatusBadge kind="ok" label={t('booking.freeAllDay')} />
  ) : (
    <StatusBadge kind="wait" label={t('booking.bookedCount', { count: card.blocking.length })} />
  );
}

function RoomCardView({
  card,
  meta,
  levels,
  selected,
  nowMin,
  index,
  onSelect,
}: {
  card: RoomCard;
  meta: string;
  levels: number | null;
  selected: boolean;
  nowMin: number | null;
  index: number;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const services = (card.room.services ?? []).filter((s) => s.isActive !== false);
  return (
    <PressableCard
      testID={`booking-room-${index}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${card.room.name}, ${meta}`}
      onPress={onSelect}
      selected={selected}
      className="gap-3 overflow-visible p-4"
    >
      {selected ? (
        <View className="absolute right-0 top-0 h-6 flex-row items-center gap-1 rounded-bl-[10px] rounded-tr-[18px] bg-primary px-2.5">
          <Icon icon={CheckIcon} size={12} weight="bold" color="on-primary" />
          <Text weight="bold" className="text-on-primary" style={{ fontSize: 11, lineHeight: 14 }}>
            {t('booking.roomSelected')}
          </Text>
        </View>
      ) : null}
      <View className={cn('flex-row items-center gap-3', selected && 'pt-2')}>
        <RoundIcon icon={DoorOpenIcon} size={48} square />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text weight="bold" numberOfLines={1} style={{ fontSize: 16, lineHeight: 21 }}>
            {card.room.name}
          </Text>
          <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12.5, lineHeight: 17 }}>
            {meta}
          </Text>
        </View>
        <StatusPill card={card} />
      </View>

      <AvailabilityBar busy={card.busy} open={card.open} close={card.close} nowMin={nowMin} />

      <View className="flex-row flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-line-2 pt-2.5">
        {services.slice(0, 3).map((s) => (
          <View key={s.id} className="flex-row items-center gap-1">
            <Icon icon={serviceIcon(s.name)} size={13} color="muted" />
            <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
              {s.name}
            </Text>
          </View>
        ))}
        <View className="flex-row items-center gap-1">
          <Icon icon={SquareCheckBigIcon} size={13} color="muted" />
          <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {levels === null ? t('booking.levelsUnknown') : levels === 0 ? t('booking.tagNoApproval') : t('booking.tagLevels', { count: levels })}
          </Text>
        </View>
      </View>
    </PressableCard>
  );
}
