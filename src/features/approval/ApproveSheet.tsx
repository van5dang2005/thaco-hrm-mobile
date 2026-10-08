import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { sameId } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { formatDayMonth, formatTime, toDateKey, vnParts, weekdayOf } from '@/core/time/vn';
import { roomsApi } from '@/features/room-booking/api';
import { useBooking, useGroupSessions } from '@/features/room-booking/hooks';
import { bookingFrom, bookingTo } from '@/features/room-booking/logic';
import { BookingStatus, type BookingDto } from '@/features/room-booking/types';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { DateBadge } from '@/shared/ui/DateBadge';
import { Icon } from '@/shared/ui/Icon';
import { ArrowLeftRightIcon, CheckIcon, InfoIcon, RepeatIcon, SquareCheckBigIcon, TriangleAlertIcon, XIcon } from '@/shared/ui/icons';
import { NoteField } from '@/shared/ui/NoteField';
import { NumberStepper } from '@/shared/ui/NumberStepper';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { SelectSheet } from '@/shared/ui/SelectSheet';
import { shadows } from '@/shared/ui/shadows';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { approvalsApi } from './api';

export type Scope = 'single' | 'series';

type Props = {
  bookingId: string | null;
  /** Level being approved and the room's level count, when known ("Cấp 2/2"). */
  level?: { order: number; total: number | null } | null;
  /** Pending requests of other groups overlapping this one (the room line shows a warning). */
  overlaps?: number;
  onClose: () => void;
  onDone?: () => void;
};

/** Small caps section label of the sheet, with an optional note on the right. */
export function SheetLabel({ children, right }: { children: string; right?: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text weight="bold" className="text-muted" style={{ fontSize: 11.5, lineHeight: 15, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {children}
      </Text>
      {right ? (
        <Text className="text-subtle" style={{ fontSize: 11.5, lineHeight: 15 }}>
          {right}
        </Text>
      ) : null}
    </View>
  );
}

/** "Áp dụng cho" (3h): this session, or the pending rest of the series with its dates (→ isUpdateSingleDay). */
export function ScopeChoice({ value, onChange, booking, sessions }: { value: Scope; onChange: (scope: Scope) => void; booking: BookingDto; sessions: BookingDto[] }) {
  const { t } = useTranslation();
  const from = bookingFrom(booking);
  const day = from ? `${t(`time.weekday.${String(weekdayOf(toDateKey(from))) as '0'}`)} ${formatDayMonth(from)}` : '';
  const dates = sessions.map((s) => bookingFrom(s)).filter((d): d is Date => !!d);
  return (
    <View className="gap-2">
      <SheetLabel>{t('approvals.applyTo')}</SheetLabel>
      <View className="flex-row gap-2">
        <ScopeCard testID="approve-scope-single" selected={value === 'single'} onPress={() => onChange('single')} title={t('approvals.onlySessionTitle')}>
          <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
            {day}
          </Text>
        </ScopeCard>
        <ScopeCard testID="approve-scope-series" selected={value === 'series'} onPress={() => onChange('series')} title={t('approvals.wholeSeriesShort')} icon>
          <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
            {t('approvals.pendingSessions', { count: Math.max(dates.length, 1) })}
          </Text>
          {dates.length > 1 ? (
            <View className="mt-1.5 flex-row flex-wrap gap-1">
              {dates.slice(0, 6).map((d, i) => (
                <View key={d.toISOString()} className={`h-[22px] justify-center rounded-[6px] px-1.5 ${i === 0 && value === 'series' ? 'bg-primary' : 'bg-primary-tint'}`}>
                  <Text mono weight="semibold" className={i === 0 && value === 'series' ? 'text-on-primary' : 'text-primary-tint-text'} style={{ fontSize: 10.5, lineHeight: 13 }}>
                    {String(vnParts(d).day).padStart(2, '0')}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScopeCard>
      </View>
    </View>
  );
}

function ScopeCard({ title, icon, selected, onPress, children, testID }: { title: string; icon?: boolean; selected: boolean; onPress: () => void; children: ReactNode; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="min-h-[76px] min-w-0 flex-1 rounded-[16px] p-3 active:opacity-80"
      style={{ borderWidth: 2, borderColor: selected ? colors.primary : 'transparent', backgroundColor: selected ? colors['selected-tint'] : colors.panel }}
    >
      <View className="flex-row items-center gap-1.5 pr-6">
        {icon ? <Icon icon={RepeatIcon} size={14} color={selected ? 'primary' : 'ink'} /> : null}
        <Text weight="bold" numberOfLines={1} className="flex-shrink" style={{ fontSize: 14, lineHeight: 19, color: selected ? colors.primary : colors.ink }}>
          {title}
        </Text>
      </View>
      {children}
      <View className="absolute right-2.5 top-2.5">
        {selected ? (
          <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Icon icon={CheckIcon} size={11} weight="bold" color="on-primary" />
          </View>
        ) : (
          <View className="h-5 w-5 rounded-full border-[1.5px] border-line-strong bg-elevated" />
        )}
      </View>
    </Pressable>
  );
}

/** Grey summary of the request (3h): date badge, title, "14:00–15:30 · organizer · unit". */
export function BookingSummary({ booking }: { booking: BookingDto }) {
  const { t } = useTranslation();
  const from = bookingFrom(booking);
  const to = bookingTo(booking);
  const unit = booking.user?.departments?.[0]?.name;
  return (
    <View className="flex-row items-center gap-3 rounded-[16px] bg-panel p-3">
      {from ? (
        <DateBadge weekday={t(`time.weekdayShort.${String(weekdayOf(toDateKey(from))) as '0'}`)} day={String(vnParts(from).day).padStart(2, '0')} month={`Th${vnParts(from).month}`} />
      ) : null}
      <View className="min-w-0 flex-1 gap-1">
        <Text weight="bold" numberOfLines={2} style={{ fontSize: 15, lineHeight: 20 }}>
          {booking.content || booking.code}
        </Text>
        <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
          <Text mono weight="semibold" className="text-ink-2" style={{ fontSize: 12 }}>{`${formatTime(from)}–${formatTime(to)}`}</Text>
          {[booking.user?.fullname, unit].filter(Boolean).map((v) => ` · ${v}`).join('')}
        </Text>
      </View>
    </View>
  );
}

/** Approve one booking (design 3h): scope, optional room / attendee change, note, then reject or approve N sessions. */
export function ApproveSheet({ bookingId, level, overlaps = 0, onClose, onDone }: Props) {
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
    enabled: !!from && !!to && !!bookingId,
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

  const chosenRoom = roomId ? available.data?.find((r) => sameId(r.id, roomId)) : undefined;
  const roomName = chosenRoom?.name ?? b?.room?.name ?? '—';
  const seats = chosenRoom?.numberOfSeats ?? b?.room?.numberOfSeats ?? null;
  const count = people ?? b?.numberOfParticipants ?? 1;
  const sessions = series && !isUpdateSingleDay ? pendingSessions : b ? [b] : [];
  const sessionCount = Math.max(sessions.length, 1);
  const firstDay = sessions.length ? bookingFrom(sessions[0]) : from;
  const lastDay = sessions.length ? bookingFrom(sessions[sessions.length - 1]) : from;
  const busy = approve.isPending || reject.isPending;
  const final = !!level?.order && !!level.total && level.order >= level.total;
  const suggestions = t('approvals.suggestions', { returnObjects: true }) as unknown as string[];
  const caption = [b?.code, level?.order ? (level.total ? t('approvals.levelOf', { order: level.order, total: level.total }) : t('approvals.level', { order: level.order })) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <BottomSheet
      testID="approve-sheet"
      visible={!!bookingId}
      onClose={onClose}
      icon={SquareCheckBigIcon}
      iconTone="ok"
      title={t('approvals.approveSheetTitle')}
      caption={caption || undefined}
      scrollable
      footer={
        <View className="gap-2.5">
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <View className="flex-row gap-2.5">
            <Button
              testID="approve-sheet-reject"
              className="flex-1"
              size="xl"
              variant="danger-outline"
              icon={XIcon}
              label={t('approvals.reject')}
              loading={reject.isPending}
              disabled={busy || !b}
              onPress={() => reject.mutate()}
            />
            <Pressable
              testID="approve-sheet-approve"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || !b, busy: approve.isPending }}
              disabled={busy || !b}
              onPress={() => approve.mutate()}
              className="h-14 flex-[1.7] flex-row items-center gap-3 rounded-[14px] bg-success px-3.5 active:opacity-85"
              style={[shadows.success, { opacity: busy || !b ? 0.6 : 1 }]}
            >
              <View className="h-[30px] w-[30px] items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)' }}>
                {approve.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon icon={CheckIcon} size={16} weight="bold" rawColor="#FFFFFF" />}
              </View>
              <View className="min-w-0 flex-1">
                <Text weight="bold" numberOfLines={1} className="text-white" style={{ fontSize: 14.5, lineHeight: 19 }}>
                  {sessionCount > 1 ? t('approvals.approveSessions', { count: sessionCount }) : series ? t('approvals.approveOne') : t('approvals.approve')}
                </Text>
                <Text mono numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, color: colors['success-on'] }}>
                  {sessionCount > 1 && firstDay && lastDay ? `${formatDayMonth(firstDay)} → ${formatDayMonth(lastDay)}` : formatDayMonth(firstDay)}
                </Text>
              </View>
            </Pressable>
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
          <BookingSummary booking={b} />

          {series ? <ScopeChoice value={scope} onChange={setScope} booking={b} sessions={pendingSessions} /> : null}

          <View className="gap-2">
            <SheetLabel right={t('approvals.optional')}>{t('approvals.adjust')}</SheetLabel>
            <View className="flex-row gap-2">
              <View className="min-w-0 flex-1 gap-1 rounded-[16px] border border-line p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
                    {t('approvals.room')}
                  </Text>
                  <Pressable testID="approve-change-room" accessibilityRole="button" onPress={() => setChoosingRoom(true)} hitSlop={10} className="flex-row items-center gap-1 active:opacity-60">
                    <Icon icon={ArrowLeftRightIcon} size={12} weight="bold" color="primary" />
                    <Text weight="bold" className="text-primary" style={{ fontSize: 12.5, lineHeight: 16 }}>
                      {t('approvals.change')}
                    </Text>
                  </Pressable>
                </View>
                <Text weight="bold" numberOfLines={1} style={{ fontSize: 16, lineHeight: 21 }}>
                  {roomName}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Icon icon={overlaps && !roomId ? TriangleAlertIcon : CheckIcon} size={12} weight="bold" color={overlaps && !roomId ? 'warning' : 'success'} />
                  <Text numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 15, color: overlaps && !roomId ? colors['warning-text'] : colors['success-text'] }}>
                    {overlaps && !roomId ? t('approvals.conflictsCount', { count: overlaps }) : t('approvals.noConflict')}
                  </Text>
                </View>
              </View>
              <View className="min-w-0 flex-1 gap-1.5 rounded-[16px] border border-line p-3">
                <Text className="text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
                  {t('approvals.people')}
                </Text>
                <NumberStepper testID="approve-people" value={count} onChange={setPeople} min={1} max={500} accessibilityLabel={t('approvals.people')} warn={!!seats && count > seats} />
                {seats ? <ProgressBar value={count / seats} color={count > seats ? colors.danger : colors.success} height={4} /> : null}
              </View>
            </View>
          </View>

          <View className="gap-2">
            <SheetLabel>{t('approvals.noteTitle')}</SheetLabel>
            <View className="flex-row flex-wrap gap-1.5">
              {suggestions.map((s) => {
                const active = comment.trim() === s;
                return (
                  <Pressable
                    key={s}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setComment(active ? '' : s)}
                    className="h-[30px] justify-center rounded-full px-3 active:opacity-70"
                    style={{ backgroundColor: active ? colors['primary-tint'] : colors.panel, borderWidth: 1, borderColor: active ? colors['wait-border'] : 'transparent' }}
                  >
                    <Text weight={active ? 'bold' : 'medium'} style={{ fontSize: 12, lineHeight: 16, color: active ? colors.primary : colors['ink-2'] }}>
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <NoteField testID="approve-note" value={comment} onChangeText={setComment} placeholder={t('approvals.notePlaceholder')} />
          </View>

          {level?.order ? (
            <View className="flex-row items-start gap-1.5">
              <Icon icon={InfoIcon} size={13} color="muted" />
              <Text className="flex-1 text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
                {final ? t('approvals.finalNote') : t('approvals.nextNote')}
              </Text>
            </View>
          ) : null}
        </>
      )}

      <SelectSheet
        visible={choosingRoom}
        onClose={() => setChoosingRoom(false)}
        title={t('approvals.chooseRoom')}
        value={roomId ?? b?.roomId ?? undefined}
        options={[
          ...(b?.room ? [{ value: b.room.id, label: `${b.room.name} · ${t('rooms.seats', { seats: b.room.numberOfSeats ?? 0 })}` }] : []),
          ...(available.data ?? []).filter((r) => !sameId(r.id, b?.roomId)).map((r) => ({ value: r.id, label: `${r.name} · ${t('rooms.seats', { seats: r.numberOfSeats ?? 0 })}` })),
        ]}
        onSelect={(value) => setRoomId(sameId(value, b?.roomId) ? undefined : value)}
      />
    </BottomSheet>
  );
}

/** Reject one booking: scope (series), a required reason, then "✕ Từ chối". */
export function RejectSheet({ bookingId, onClose, onDone }: { bookingId: string | null; onClose: () => void; onDone?: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const booking = useBooking(bookingId ?? undefined);
  const b = booking.data;
  const group = useGroupSessions(b);
  const pendingSessions = group.sessions.filter((s) => s.status === BookingStatus.Waiting);
  const series = b?.isSingleBooking === false;
  const [scope, setScope] = useState<Scope>('series');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState(bookingId);

  if (bookingId !== lastId) {
    setLastId(bookingId);
    setScope('series');
    setReason('');
    setError(null);
  }

  const reject = useMutation({
    mutationFn: () => approvalsApi.reject(bookingId!, { comment: reason.trim(), isUpdateSingleDay: !series || scope === 'single' }),
    onSuccess: () => {
      toast.success(t('approvals.rejected'));
      void queryClient.invalidateQueries({ queryKey: qk.approvals.root });
      void queryClient.invalidateQueries({ queryKey: qk.bookings.root });
      onDone?.();
      onClose();
    },
    onError: (e) => setError(errorMessage(e, t)),
  });

  const submit = () => {
    if (!reason.trim()) return setError(t('approvals.rejectReasonRequired'));
    setError(null);
    reject.mutate();
  };

  return (
    <BottomSheet
      testID="reject-sheet"
      visible={!!bookingId}
      onClose={onClose}
      icon={XIcon}
      iconTone="danger"
      title={t('approvals.rejectSheetTitle')}
      caption={b?.code ?? undefined}
      scrollable
      footer={
        <View className="gap-2.5">
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <Button testID="reject-sheet-confirm" size="xl" variant="danger-outline" icon={XIcon} label={t('approvals.reject')} loading={reject.isPending} disabled={!b} onPress={submit} />
        </View>
      }
    >
      {b ? <BookingSummary booking={b} /> : null}
      {b && series ? <ScopeChoice value={scope} onChange={setScope} booking={b} sessions={pendingSessions} /> : null}
      <View className="gap-2">
        <SheetLabel>{t('approvals.rejectReasonTitle')}</SheetLabel>
        <NoteField testID="reject-note" value={reason} onChangeText={setReason} placeholder={t('approvals.rejectReasonPlaceholder')} />
      </View>
    </BottomSheet>
  );
}
