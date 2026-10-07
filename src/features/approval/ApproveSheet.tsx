import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { roomPerson, sameId } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { formatDayMonth, formatTime, toDateKey, weekdayOf } from '@/core/time/vn';
import { roomsApi } from '@/features/room-booking/api';
import { useBooking, useGroupSessions } from '@/features/room-booking/hooks';
import { bookingFrom, bookingTo } from '@/features/room-booking/logic';
import { BookingStatus, type BookingDto } from '@/features/room-booking/types';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/Avatar';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, ClockCountdownIcon, DoorOpenIcon, RepeatIcon, SealCheckIcon, UsersIcon, XIcon } from '@/shared/ui/icons';
import { InfoRow } from '@/shared/ui/InfoRow';
import { NoteField } from '@/shared/ui/NoteField';
import { NumberStepper } from '@/shared/ui/NumberStepper';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { approvalsApi } from './api';

type Props = {
  bookingId: string | null;
  /** "Cấp 2/2" etc., when known. */
  levelLabel?: string;
  onClose: () => void;
  onDone?: () => void;
};

export type Scope = 'single' | 'series';

/** "Áp dụng cho": two choice cards, this session or the pending rest of the series (→ isUpdateSingleDay). */
export function ScopeChoice({ value, onChange, date, seriesNote }: { value: Scope; onChange: (scope: Scope) => void; date: string; seriesNote: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const option = (scope: Scope) => {
    const selected = value === scope;
    return (
      <Pressable
        key={scope}
        testID={`approve-scope-${scope}`}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={() => onChange(scope)}
        className="min-h-[56px] flex-1 justify-center gap-0.5 rounded-[14px] px-3 py-2.5 active:opacity-80"
        style={{ borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.line, backgroundColor: selected ? colors['selected-tint'] : colors.surface }}
      >
        <View className="flex-row items-center gap-[5px] pr-5">
          {scope === 'series' ? <Icon icon={RepeatIcon} size={13} rawColor={selected ? colors.primary : colors.ink} /> : null}
          <Text weight="semibold" numberOfLines={1} className="flex-shrink" style={{ fontSize: 13.5, lineHeight: 18, color: selected ? colors.primary : colors.ink }}>
            {scope === 'single' ? t('approvals.onlySessionTitle') : t('approvals.wholeSeriesShort')}
          </Text>
        </View>
        <Text mono={scope === 'single'} numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
          {scope === 'single' ? date : seriesNote}
        </Text>
        {selected ? (
          <View className="absolute right-2.5 top-2.5 h-[18px] w-[18px] items-center justify-center rounded-full bg-primary">
            <Icon icon={CheckIcon} size={10} weight="bold" color="on-primary" />
          </View>
        ) : null}
      </Pressable>
    );
  };
  return (
    <View className="gap-2">
      <Text weight="semibold" className="text-muted" style={{ fontSize: 13, lineHeight: 17 }}>
        {t('approvals.applyTo')}
      </Text>
      <View className="flex-row gap-2">{[option('single'), option('series')]}</View>
    </View>
  );
}

/** Grey summary of the request: title, time · day(s), organizer (3h). */
export function BookingSummary({ booking, lastSession }: { booking: BookingDto; lastSession?: BookingDto | null }) {
  const { t } = useTranslation();
  const from = bookingFrom(booking);
  const to = bookingTo(booking);
  const last = lastSession ? bookingFrom(lastSession) : null;
  const day = from ? `${t(`time.weekdayShort.${String(weekdayOf(toDateKey(from))) as '0'}`)} ${formatDayMonth(from)}` : '';
  const range = last && from && toDateKey(last) !== toDateKey(from) ? `${day} → ${formatDayMonth(last)}` : day;
  const organizer = booking.user ? roomPerson(booking.user) : null;
  return (
    <View className="gap-2 rounded-[18px] bg-field p-3.5">
      <Text weight="semibold" numberOfLines={2} style={{ fontSize: 15, lineHeight: 20 }}>
        {booking.content || booking.code}
      </Text>
      <View className="flex-row items-center gap-2">
        <Icon icon={ClockCountdownIcon} size={14} color="ink-2" />
        <Text numberOfLines={1} className="flex-shrink text-ink-2" style={{ fontSize: 12.5, lineHeight: 17 }}>
          <Text mono weight="semibold" className="text-ink-2" style={{ fontSize: 12.5 }}>{`${formatTime(from)}–${formatTime(to)}`}</Text>
          {range ? ` · ${range}` : ''}
        </Text>
      </View>
      {organizer ? (
        <View className="flex-row items-center gap-2">
          <Avatar name={organizer.name} uri={organizer.avatarUrl} size={20} />
          <Text numberOfLines={1} className="flex-shrink text-ink-2" style={{ fontSize: 12.5, lineHeight: 17 }}>
            {[organizer.name, organizer.department].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Approve / reject one booking (design 3h), optionally changing room or attendee count. */
export function ApproveSheet({ bookingId, levelLabel, onClose, onDone }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const booking = useBooking(bookingId ?? undefined);
  const b = booking.data;
  const group = useGroupSessions(b);
  const pendingSessions = group.sessions.filter((s) => s.status === BookingStatus.Waiting);
  const series = b?.isSingleBooking === false;
  const [scope, setScope] = useState<Scope>('series');
  const [roomId, setRoomId] = useState<string | undefined>();
  const [people, setPeople] = useState<number | undefined>();
  const [comment, setComment] = useState('');
  const [choosingRoom, setChoosingRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState(bookingId);

  if (bookingId !== lastId) {
    setLastId(bookingId);
    setScope('series');
    setRoomId(undefined);
    setPeople(undefined);
    setComment('');
    setError(null);
    setChoosingRoom(false);
  }

  const from = b ? bookingFrom(b) : null;
  const to = b ? bookingTo(b) : null;
  const available = useQuery({
    queryKey: qk.rooms.available({ areaId: b?.room?.areaId, from: b?.from, to: b?.to }),
    queryFn: () => roomsApi.availableRooms({ areaId: b?.room?.areaId ?? undefined, startTime: from!.toISOString(), endTime: to!.toISOString() }),
    enabled: choosingRoom && !!from && !!to,
  });

  const isUpdateSingleDay = !series || scope === 'single';
  const finish = (message: string) => {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: qk.approvals.root });
    void queryClient.invalidateQueries({ queryKey: qk.bookings.root });
    onDone?.();
    onClose();
  };

  const approve = useMutation({
    mutationFn: () =>
      approvalsApi.approve(bookingId!, {
        roomId: roomId && !sameId(roomId, b?.roomId) ? roomId : undefined,
        numberOfParticipants: people !== undefined && people !== b?.numberOfParticipants ? people : undefined,
        comment: comment.trim() || undefined,
        isUpdateSingleDay,
      }),
    onSuccess: () => finish(t('approvals.approved')),
    onError: (e) => setError(errorMessage(e, t)),
  });
  const reject = useMutation({
    mutationFn: () => approvalsApi.reject(bookingId!, { comment: comment.trim() || undefined, isUpdateSingleDay }),
    onSuccess: () => finish(t('approvals.rejected')),
    onError: (e) => setError(errorMessage(e, t)),
  });

  const roomName = (roomId ? available.data?.find((r) => sameId(r.id, roomId))?.name : undefined) ?? b?.room?.name ?? '—';
  const sessionCount = series ? Math.max(pendingSessions.length, 1) : 1;
  const approveLabel = isUpdateSingleDay || sessionCount <= 1 ? t('approvals.approve') : t('approvals.approveSessions', { count: sessionCount });
  const busy = approve.isPending || reject.isPending;

  return (
    <BottomSheet
      testID="approve-sheet"
      visible={!!bookingId}
      onClose={onClose}
      icon={SealCheckIcon}
      iconTone="ok"
      title={t('approvals.approveSheetTitle')}
      caption={[b?.code, levelLabel].filter(Boolean).join(' · ') || undefined}
      scrollable
      footer={
        <View className="gap-2.5">
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <View className="flex-row gap-2.5">
            <Button testID="approve-sheet-reject" className="flex-1" variant="danger" icon={XIcon} label={t('approvals.reject')} loading={reject.isPending} disabled={busy || !b} onPress={() => reject.mutate()} />
            <Button
              testID="approve-sheet-approve"
              className="flex-[1.4]"
              variant="success"
              icon={CheckIcon}
              label={approveLabel}
              loading={approve.isPending}
              disabled={busy || !b}
              onPress={() => approve.mutate()}
            />
          </View>
        </View>
      }
    >
      {!b ? (
        <View className="py-8">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <BookingSummary booking={b} lastSession={series ? group.sessions[group.sessions.length - 1] : null} />

          {series ? <ScopeChoice value={scope} onChange={setScope} date={formatDayMonth(from)} seriesNote={t('approvals.pendingSessions', { count: Math.max(pendingSessions.length, 1) })} /> : null}

          <View className="overflow-hidden rounded-[18px] border border-line">
            <InfoRow
              icon={DoorOpenIcon}
              iconTone="brand"
              label={t('approvals.room')}
              value={
                <View className="flex-shrink flex-row items-center gap-1.5">
                  <Text weight="medium" numberOfLines={1} className="flex-shrink" style={{ fontSize: 13.5, lineHeight: 18 }}>
                    {roomName}
                  </Text>
                  <Pressable testID="approve-change-room" accessibilityRole="button" onPress={() => setChoosingRoom((v) => !v)} hitSlop={10}>
                    <Text weight="semibold" className="text-primary" style={{ fontSize: 13.5, lineHeight: 18 }}>
                      {t('approvals.change')}
                    </Text>
                  </Pressable>
                </View>
              }
            >
              {choosingRoom ? (
                <View className="gap-1 border-t border-line-2 px-3.5 py-2">
                  {available.isLoading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (available.data ?? []).length === 0 ? (
                    <Text className="py-2 text-sub text-muted">{t('approvals.noAvailableRooms')}</Text>
                  ) : (
                    (available.data ?? []).map((room) => {
                      const active = sameId(room.id, roomId ?? b.roomId);
                      return (
                        <Pressable
                          key={room.id}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          onPress={() => {
                            setRoomId(room.id);
                            setChoosingRoom(false);
                          }}
                          className="min-h-[44px] flex-row items-center gap-2"
                        >
                          <Text numberOfLines={1} className={cn('flex-1 text-body', active && 'text-primary')}>{`${room.name} · ${t('rooms.seats', { seats: room.numberOfSeats ?? 0 })}`}</Text>
                          {active ? <Icon icon={CheckIcon} size={16} weight="bold" color="primary" /> : null}
                        </Pressable>
                      );
                    })
                  )}
                </View>
              ) : null}
            </InfoRow>
            <InfoRow
              divider
              icon={UsersIcon}
              iconTone="brand"
              label={t('approvals.people')}
              value={<NumberStepper testID="approve-people" value={people ?? b.numberOfParticipants ?? 1} onChange={setPeople} min={1} max={500} accessibilityLabel={t('approvals.people')} />}
            />
          </View>

          <NoteField testID="approve-note" value={comment} onChangeText={setComment} placeholder={t('approvals.note')} />
        </>
      )}
    </BottomSheet>
  );
}
