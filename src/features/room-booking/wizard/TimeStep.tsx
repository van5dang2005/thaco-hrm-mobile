import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { sameId } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { addDays, atMinutes, formatKey, formatMinutes, minutesOfDay, parseTimeOfDay, todayKey, weekdayOf, type DateKey } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { cn } from '@/shared/lib/cn';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { DatePickerSheet } from '@/shared/ui/DatePickerSheet';
import { Icon } from '@/shared/ui/Icon';
import { NumberStepper } from '@/shared/ui/NumberStepper';
import { CaretLeftIcon, CaretRightIcon, RepeatIcon, UsersIcon } from '@/shared/ui/icons';
import { Segmented } from '@/shared/ui/Segmented';
import { SelectSheet } from '@/shared/ui/SelectSheet';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/StateViews';
import { Text } from '@/shared/ui/Text';
import { FieldBox } from '@/shared/ui/FieldBox';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { onBlue, ScreenShell } from '@/shared/ui/ScreenShell';

import { buildSlots, busyFromBlocks, nextRange, rangeFromMinutes, rangeMinutes, splitDuration, type SlotRange } from '../availability';
import { draftSessions, useBookingDraft } from '../draftStore';
import { useCrossLevel, useRooms, useSchedule } from '../hooks';
import { evaluateRoom, MAX_SESSIONS, roomDayBlocks, type Recurrence } from '../logic';
import { WizardHeader } from '../ui/WizardHeader';
import { SlotGrid } from '../ui/SlotGrid';
import { useBlockReasonText } from './navigation';
import { useRoomMeta } from './RoomStep';

/** B2 (4b): pick a contiguous range of 30-minute slots, people and repetition. */
export function TimeStep() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const draft = useBookingDraft((s) => s.draft);
  const patch = useBookingDraft((s) => s.patch);
  const reasonText = useBlockReasonText();
  const roomMeta = useRoomMeta();
  const now = useNow();
  const today = todayKey(now);
  const rooms = useRooms(draft.areaId);
  const crossLevel = useCrossLevel();
  const room = rooms.data?.find((r) => sameId(r.id, draft.roomId));
  const sessions = draftSessions(draft);
  const lastSession = sessions[sessions.length - 1];
  // One query covers the chosen day and every repeat, for the slot grid and the series check.
  const schedule = useSchedule({ fromDate: atMinutes(draft.dateKey, 0).toISOString(), toDate: atMinutes(addDays(lastSession, 1), 0).toISOString(), areaId: draft.areaId });
  const [picked, setPicked] = useState<SlotRange | null | undefined>(undefined);
  const [sheet, setSheet] = useState<'date' | 'repeat' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!draft.roomId) return <Redirect href="/rooms/book" />;

  const editGroup = draft.mode === 'edit' ? draft.edit?.groupId : undefined;
  const bookings = (schedule.data ?? []).filter((b) => !(editGroup && sameId(b.groupId, editGroup)));
  const open = parseTimeOfDay(room?.openedAt) ?? 0;
  const close = parseTimeOfDay(room?.closedAt) ?? 24 * 60;
  const isToday = draft.dateKey === today;
  const busy = busyFromBlocks(roomDayBlocks(bookings.filter((b) => sameId(b.roomId ?? b.room?.id, draft.roomId)), draft.dateKey));
  const slots = room ? buildSlots({ open, close, busy, blockPending: !!room.isDisableOverlappingTimes, nowMin: isToday ? minutesOfDay(now) : null }) : [];
  // Until the user taps, the grid shows the draft's times when they still fit.
  const range = picked === undefined ? rangeFromMinutes(slots, draft.startMin, draft.endMin) : picked;
  const pendingInRange = !!range && slots.slice(range.start, range.end + 1).some((s) => s.state === 'pending');
  const maxKey = room?.isDayLimited && room.maxAdvanceRegistrationDays != null ? addDays(today, room.maxAdvanceRegistrationDays) : undefined;
  const editingSingle = draft.mode === 'edit' && draft.edit?.scope === 'single';
  const overCapacity = room?.numberOfSeats != null && draft.people > room.numberOfSeats;

  const onSlot = (index: number) => {
    setError(null);
    const next = nextRange(range, index, slots);
    setPicked(next);
    if (next) patch(rangeMinutes(slots, next));
  };

  const changeDay = (key: DateKey) => {
    setPicked(undefined);
    setError(null);
    patch({ dateKey: key, untilKey: draft.untilKey > key ? draft.untilKey : addDays(key, 28) });
  };

  const next = () => {
    if (!range || !room) return;
    setError(null);
    if (draft.recurrence !== 'none' && draft.untilKey <= draft.dateKey) return setError(t('booking.untilBeforeStart'));
    if (sessions.length > MAX_SESSIONS) return setError(t('booking.tooManySessions', { max: MAX_SESSIONS }));
    const check = evaluateRoom({
      room,
      sessions,
      startMin: draft.startMin,
      endMin: draft.endMin,
      people: draft.people,
      bookings: schedule.data ?? [],
      crossLevel: crossLevel(room),
      excludeGroupId: editGroup,
    });
    if (!check.selectable) return setError(reasonText(check.block));
    router.push('/rooms/book/details');
  };

  const duration = range ? splitDuration(draft.endMin - draft.startMin) : null;
  const durationLabel = !duration
    ? t('booking.pickRange')
    : duration.hours && duration.minutes
      ? t('time.hoursMinutes', { hours: duration.hours, minutes: duration.minutes })
      : duration.hours
        ? t('time.hours', { count: duration.hours })
        : t('time.minutes', { count: duration.minutes });
  const dayLabel = `${t(`time.weekday.${String(weekdayOf(draft.dateKey)) as '0'}`)}, ${formatKey(draft.dateKey)}`;
  const fg = colors['header-name'];
  const recurrenceName = draft.recurrence === 'weekly' ? t('booking.recurrenceWeekly') : t('booking.recurrenceDaily');

  const header = (
    <>
      <WizardHeader testID="booking-time-header" title={t('booking.chooseTime')} step={2} />
      <View className="gap-1 px-3 pt-1.5">
        <Text weight="bold" numberOfLines={2} className="text-title" style={{ color: fg }}>
          {room?.name ?? ' '}
        </Text>
        {room ? (
          <Text numberOfLines={2} className="text-sub" style={{ color: colors['header-job'] }}>
            {`${roomMeta(room)} · ${t('booking.opensAt', { open: formatMinutes(open), close: formatMinutes(close) })}`}
          </Text>
        ) : null}
      </View>
      <View className="mx-3 mt-4 h-11 flex-row items-center justify-between rounded-[14px] px-1.5" style={{ backgroundColor: onBlue(0.12) }}>
        <DayArrow icon={CaretLeftIcon} label={t('rooms.previousDay')} disabled={draft.dateKey <= today} onPress={() => changeDay(addDays(draft.dateKey, -1))} />
        <Pressable testID="booking-date" accessibilityRole="button" accessibilityLabel={dayLabel} onPress={() => setSheet('date')} className="h-11 flex-1 items-center justify-center">
          <Text weight="semibold" numberOfLines={1} className="text-body" style={{ color: fg }}>
            {dayLabel}
          </Text>
        </Pressable>
        <DayArrow icon={CaretRightIcon} label={t('rooms.nextDay')} disabled={!!maxKey && draft.dateKey >= maxKey} onPress={() => changeDay(addDays(draft.dateKey, 1))} />
      </View>
    </>
  );

  const footer = (
    <View className="flex-1 gap-3">
      {error ? (
        <Banner tone="danger" testID="booking-time-error">
          {error}
        </Banner>
      ) : null}
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <Text mono weight="semibold" numberOfLines={1} className={cn(!range && 'text-muted')} style={{ fontSize: 17, lineHeight: 22 }}>
            {range ? `${formatMinutes(draft.startMin)} – ${formatMinutes(draft.endMin)}` : '––:–– – ––:––'}
          </Text>
          <Text numberOfLines={1} className="text-meta text-muted">
            {durationLabel}
          </Text>
        </View>
        <Button testID="booking-time-continue" label={t('common.next')} disabled={!range} onPress={next} className="px-6" />
      </View>
    </View>
  );

  return (
    <ScreenShell header={header} footer={footer} slide sheetBg="surface" scroll={false}>
      <ScrollView contentContainerClassName="gap-3.5 px-4 pb-6 pt-5">
        <View className="flex-row items-center justify-between gap-2">
          <Text weight="semibold" className="text-card" style={{ fontSize: 16 }}>
            {t('booking.slotsTitle')}
          </Text>
          <View className="flex-row gap-2.5">
            <Legend label={t('booking.legendFree')} className="border border-input-border" />
            <Legend label={t('booking.legendTaken')} className="bg-off-tint" />
            <Legend label={t('booking.legendSelected')} className="bg-primary" />
          </View>
        </View>

        {rooms.isLoading || schedule.isLoading ? (
          <View className="gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} height={44} radius={12} />
            ))}
          </View>
        ) : schedule.isError ? (
          <ErrorState compact error={schedule.error} onRetry={() => void schedule.refetch()} />
        ) : slots.some((s) => s.state === 'free' || s.state === 'pending') ? (
          <SlotGrid slots={slots} range={range} onPress={onSlot} />
        ) : (
          <Text className="py-6 text-center text-body text-muted">{t('booking.noSlots')}</Text>
        )}

        <Text className="text-meta text-muted">{t('booking.slotHint')}</Text>
        {pendingInRange ? <Banner tone="warning">{t('booking.pendingSlotWarning')}</Banner> : null}

        <View className="rounded-[18px] border border-line">
          <View className="min-h-[52px] flex-row items-center gap-3 px-3.5 py-2">
            <RoundIcon icon={UsersIcon} size={32} />
            <View className="flex-1">
              <Text className="text-body">{t('booking.people')}</Text>
              {overCapacity ? <Text className="text-meta text-warning-text">{t('booking.seatsExceeded', { seats: room?.numberOfSeats ?? 0 })}</Text> : null}
            </View>
            <NumberStepper testID="booking-people" value={draft.people} onChange={(people) => patch({ people })} min={1} max={500} accessibilityLabel={t('booking.people')} warn={overCapacity} />
          </View>
          {!editingSingle ? (
            <>
              <View className="mr-0 h-px bg-line-2" style={{ marginLeft: 58 }} />
              <Pressable testID="booking-repeat" accessibilityRole="button" onPress={() => setSheet('repeat')} className="min-h-[52px] flex-row items-center gap-3 px-3.5 py-2 active:opacity-70">
                <RoundIcon icon={RepeatIcon} size={32} />
                <Text className="flex-1 text-body">{t('booking.repeat')}</Text>
                <Text numberOfLines={1} className="flex-shrink text-sub text-muted">
                  {draft.recurrence === 'none' ? t('booking.repeatNone') : t('booking.repeatSummary', { recurrence: recurrenceName, count: sessions.length })}
                </Text>
                <Icon icon={CaretRightIcon} size={16} color="subtle" />
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>

      <DatePickerSheet
        visible={sheet === 'date'}
        onClose={() => setSheet(null)}
        title={t('booking.date')}
        value={draft.dateKey}
        minDate={today}
        maxDate={maxKey}
        onSelect={changeDay}
      />
      <RepeatSheet visible={sheet === 'repeat'} onClose={() => setSheet(null)} />
    </ScreenShell>
  );
}

function Legend({ label, className }: { label: string; className: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View className={cn('h-2.5 w-2.5 rounded-[3px]', className)} />
      <Text numberOfLines={1} className="text-meta-sm text-muted">
        {label}
      </Text>
    </View>
  );
}

function DayArrow({ icon, label, disabled, onPress }: { icon: typeof CaretLeftIcon; label: string; disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center active:opacity-60"
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <Icon icon={icon} size={18} rawColor={colors['header-name']} />
    </Pressable>
  );
}

/** − 8 + with round 30pt buttons (44pt touch area). */
/** Lặp lại: none / daily / weekly, every N, until; previews the session days (Sundays skipped). */
function RepeatSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const draft = useBookingDraft((s) => s.draft);
  const patch = useBookingDraft((s) => s.patch);
  const [picker, setPicker] = useState<'every' | 'until' | null>(null);
  const sessions = draftSessions(draft);
  const recurring = draft.recurrence !== 'none';
  const chips = sessions.slice(0, 12);

  const setRecurrence = (recurrence: Recurrence) => {
    const minUntil = addDays(draft.dateKey, recurrence === 'weekly' ? 28 : 4);
    patch({ recurrence, interval: 1, untilKey: draft.untilKey > draft.dateKey ? draft.untilKey : minUntil });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('booking.repeatTitle')} scrollable footer={<Button label={t('booking.repeatDone')} onPress={onClose} />}>
      <Segmented<Recurrence>
        value={draft.recurrence}
        onChange={setRecurrence}
        options={[
          { value: 'none', label: t('booking.recurrenceNone'), testID: 'booking-recurrence-none' },
          { value: 'daily', label: t('booking.recurrenceDaily'), testID: 'booking-recurrence-daily' },
          { value: 'weekly', label: t('booking.recurrenceWeekly'), testID: 'booking-recurrence-weekly' },
        ]}
      />
      {recurring ? (
        <View className="gap-3">
          <View className="flex-row gap-2">
            <FieldBox
              label={t('booking.every')}
              value={draft.recurrence === 'weekly' ? t('booking.everyWeeks', { count: draft.interval }) : t('booking.everyDays', { count: draft.interval })}
              onPress={() => setPicker('every')}
            />
            <FieldBox testID="booking-until" label={t('booking.until')} value={formatKey(draft.untilKey)} onPress={() => setPicker('until')} />
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {chips.map((key) => (
              <View key={key} className="rounded-[8px] bg-primary-tint px-2 py-1">
                <Text mono weight="medium" className="text-meta text-primary-tint-text">
                  {formatKey(key, false)}
                </Text>
              </View>
            ))}
            {sessions.length > chips.length ? (
              <View className="rounded-[8px] bg-line-2 px-2 py-1">
                <Text mono weight="medium" className="text-meta text-muted">{`+${sessions.length - chips.length}`}</Text>
              </View>
            ) : null}
          </View>
          <Text className="text-meta leading-[18px] text-muted">{t('booking.sessionsNote', { count: sessions.length })}</Text>
        </View>
      ) : null}

      <SelectSheet
        visible={picker === 'every'}
        onClose={() => setPicker(null)}
        title={t('booking.every')}
        value={draft.interval}
        options={[1, 2, 3, 4].map((n) => ({
          value: n,
          label: draft.recurrence === 'weekly' ? t('booking.everyWeeks', { count: n }) : t('booking.everyDays', { count: n }),
        }))}
        onSelect={(interval) => patch({ interval })}
      />
      <DatePickerSheet
        visible={picker === 'until'}
        onClose={() => setPicker(null)}
        title={t('booking.until')}
        value={draft.untilKey}
        minDate={addDays(draft.dateKey, 1)}
        maxDate={addDays(draft.dateKey, 366)}
        onSelect={(untilKey) => patch({ untilKey })}
      />
    </BottomSheet>
  );
}
