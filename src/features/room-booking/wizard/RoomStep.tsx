import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { sameId } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { addDays, atMinutes, diffDays, formatMinutes, minutesOfDay, parseTimeOfDay, todayKey, type DateKey } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui/Icon';
import { HeaderPillButton } from '@/shared/ui/HeaderBar';
import { CalendarDotsIcon, DoorOpenIcon, LockIcon, UsersIcon } from '@/shared/ui/icons';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { ScreenShell } from '@/shared/ui/ScreenShell';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { Text } from '@/shared/ui/Text';

import { blockingBusy, busyFromBlocks, roomNow, type Busy, type RoomNow } from '../availability';
import { useBookingDraft } from '../draftStore';
import { useApprovalLevels, useCrossLevel, useDefaultAreaId, useRooms, useSchedule } from '../hooks';
import { roomDayBlocks } from '../logic';
import type { RoomDto } from '../types';
import { AreaPicker } from '../ui/AreaPicker';
import { AvailabilityBar } from '../ui/AvailabilityBar';
import { WizardHeader } from '../ui/WizardHeader';
import { DayStrip } from '../ui/DayStrip';
import { isOnlineService } from '../ui/serviceIcon';
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

  const header = (
    <>
      <WizardHeader
        testID="booking-header"
        title={draft.mode === 'edit' ? t('booking.editTitle') : t('booking.bookTitle')}
        leading="close"
        step={1}
        onBack={leave}
        right={<HeaderPillButton testID="booking-my-calendar" icon={CalendarDotsIcon} label={t('booking.myCalendar')} onPress={() => router.push('/calendar')} />}
      />
      <AreaPicker testID="booking-area" areaId={areaId} onChange={(value) => patch({ areaId: value, roomId: undefined })} />
      <DayStrip testID="booking-day" tall value={dateKey} onChange={changeDay} start={today} maxKey={maxBookableDay(roomList, today)} marked={marked} />
    </>
  );

  return (
    <ScreenShell header={header} sheetBg="surface" scroll={false}>
      {/* The chip row never shrinks; the list takes the rest of the sheet and scrolls on its own. */}
      <View className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerClassName="items-center gap-2 px-4 pb-1 pt-[18px]"
        >
          <FilterPill testID="booking-filter-all" label={t('booking.filterAll', { count: bookable.length })} selected={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterPill testID="booking-filter-free" label={isToday ? t('booking.filterFreeNow') : t('booking.filterFreeDay')} selected={filter === 'free'} onPress={() => setFilter('free')} />
          <FilterPill testID="booking-filter-seats" label={t('booking.filterSeats', { count: SEATS_FILTER })} selected={filter === 'seats'} onPress={() => setFilter('seats')} />
          {hasOnline ? <FilterPill testID="booking-filter-online" label={t('booking.filterOnline')} selected={filter === 'online'} onPress={() => setFilter('online')} /> : null}
        </ScrollView>

        <FlatList
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
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
              onPickTime={() => {
                choose(card.room);
                if (areaId && areaId !== draft.areaId) patch({ areaId });
                if (dateKey !== draft.dateKey) changeDay(dateKey);
                router.push('/rooms/book/time');
              }}
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
                  <View key={card.room.id} className="flex-row items-center gap-3 rounded-[22px] border border-line p-4 opacity-60">
                    <RoundIcon icon={LockIcon} size={40} tone="off" />
                    <View className="min-w-0 flex-1 gap-0.5">
                      <Text weight="semibold" numberOfLines={1} className="text-card">
                        {card.room.name}
                      </Text>
                      <Text numberOfLines={2} className="text-meta text-muted">
                        {card.locked === 'crossLevel'
                          ? t('booking.reasonCrossLevel')
                          : t('booking.reasonAdvance', { days: card.room.maxAdvanceRegistrationDays ?? 0 })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null
          }
        />
      </View>
    </ScreenShell>
  );
}

export function FilterPill({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn('h-[34px] shrink-0 justify-center rounded-full px-3.5 active:opacity-80', selected ? 'bg-inverse' : 'border border-input-border')}
    >
      <Text weight={selected ? 'semibold' : 'regular'} numberOfLines={1} className={cn('text-sub', selected ? 'text-on-inverse' : 'text-ink')}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatusPill({ card }: { card: RoomCard }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  let tone: 'success' | 'warning' | 'off' | 'primary' = 'success';
  let label: string;
  if (card.now) {
    if (card.now.kind === 'free') label = t('booking.freeUntil', { time: formatMinutes(card.now.until) });
    else if (card.now.kind === 'busy') {
      tone = 'warning';
      label = t('booking.busyUntil', { time: formatMinutes(card.now.until) });
    } else {
      tone = 'off';
      label = t('booking.closedNow');
    }
  } else if (card.blocking.length === 0) {
    label = t('booking.freeAllDay');
  } else {
    tone = 'primary';
    label = t('booking.bookedCount', { count: card.blocking.length });
  }
  const palette = {
    success: { bg: colors['success-tint'], fg: colors['success-text'], dot: colors.success },
    warning: { bg: colors['warning-tint'], fg: colors['warning-text'], dot: colors.warning },
    off: { bg: colors['off-tint'], fg: colors['off-text'], dot: colors.subtle },
    primary: { bg: colors['primary-tint'], fg: colors['primary-tint-text'], dot: colors.primary },
  }[tone];
  return (
    <View className="h-[26px] flex-row items-center gap-1.5 rounded-full px-2.5" style={{ backgroundColor: palette.bg }}>
      <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: palette.dot }} />
      <Text weight="semibold" numberOfLines={1} className="text-meta-sm" style={{ color: palette.fg }}>
        {label}
      </Text>
    </View>
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
  onPickTime,
}: {
  card: RoomCard;
  meta: string;
  levels: number | null;
  selected: boolean;
  nowMin: number | null;
  index: number;
  onSelect: () => void;
  onPickTime: () => void;
}) {
  const { t } = useTranslation();
  const services = (card.room.services ?? []).filter((s) => s.isActive !== false).map((s) => s.name);
  return (
    <Pressable
      testID={`booking-room-${index}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${card.room.name}, ${meta}`}
      onPress={onSelect}
      className={cn('gap-3.5 rounded-[22px] bg-surface p-4', selected ? 'border-2 border-primary' : 'border border-line')}
      // Keep the content in place when the border grows from 1 to 2.
      style={selected ? undefined : { padding: 17 }}
    >
      <View className="flex-row items-center gap-3">
        <RoundIcon icon={DoorOpenIcon} size={48} />
        <View className="min-w-0 flex-1 gap-[3px]">
          <Text weight="semibold" numberOfLines={1} style={{ fontSize: 16, lineHeight: 21 }}>
            {card.room.name}
          </Text>
          <View className="flex-row items-center gap-[5px]">
            <Icon icon={UsersIcon} size={13} color="muted" />
            <Text numberOfLines={1} className="flex-shrink text-meta text-muted">
              {meta}
            </Text>
          </View>
        </View>
        <StatusPill card={card} />
      </View>

      <AvailabilityBar busy={card.busy} open={card.open} close={card.close} nowMin={nowMin} />

      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={2} className="text-meta text-muted">
            {services.length ? services.join(' · ') : t('booking.noServicesShort')}
          </Text>
          <Text numberOfLines={1} className="text-meta text-subtle">
            {levels === null ? t('booking.levelsUnknown') : levels === 0 ? t('booking.tagNoApproval') : t('booking.tagLevels', { count: levels })}
          </Text>
        </View>
        <Pressable
          testID={`booking-room-${index}-time`}
          accessibilityRole="button"
          accessibilityLabel={`${t('booking.pickTime')}, ${card.room.name}`}
          onPress={onPickTime}
          className={cn('h-[38px] min-w-[44px] justify-center rounded-[12px] px-4 active:opacity-80', selected ? 'bg-primary' : 'bg-icon-ring')}
        >
          <Text weight="semibold" numberOfLines={1} className={cn('text-sub', selected ? 'text-on-primary' : 'text-primary-tint-text')}>
            {t('booking.pickTime')}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
