import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { qk } from '@/core/query/keys';
import { useCapabilities } from '@/core/session/capabilities';
import { useSessionStore } from '@/core/session/sessionStore';
import { useParcelMe } from '@/core/session/useMe';
import { sameId } from '@/core/session/userTypes';
import { addDays, atMinutes, minutesOfDay, parseTimeOfDay, todayKey } from '@/core/time/vn';
import { useApprovalStats } from '@/features/approval/hooks';
import { parcelsApi } from '@/features/parcel/api';
import { useMyDelegations, useMyParcelStats, useReceptionStats } from '@/features/parcel/hooks';
import { DelegationStatus, ParcelStatus } from '@/features/parcel/types';
import { bookingsApi } from '@/features/room-booking/api';
import { useDefaultAreaId, useRooms, useSchedule } from '@/features/room-booking/hooks';
import { bookingFrom, bookingTo } from '@/features/room-booking/logic';
import { BookingStatus, type BookingDto } from '@/features/room-booking/types';

import { useHomePrefs } from './prefs';

/** What a badge / summary hook returns: the slice of a query result the layouts read. */
export type Signal<T> = Pick<UseQueryResult<T>, 'data' | 'isLoading'>;

type SummaryKey = 'directory' | 'comingSoon' | 'paytime' | 'bookRoom';

/** A fixed second line for the card layout. */
export const staticSummary = (key: SummaryKey) =>
  function useStaticSummary(): Signal<string> {
    const { t } = useTranslation();
    return { data: t(`home.summary.${key}`), isLoading: false };
  };

/** Summaries that cost extra requests only run while the card layout is on screen (or previewed). */
function useCardsVisible() {
  return useHomePrefs((s) => (s.draft?.layout ?? s.layout) === 'cards');
}

// ── Meetings ────────────────────────────────────────────────────────────────

function todayWindow(now = new Date()) {
  const today = todayKey(now);
  return { fromDate: atMinutes(today, 0).toISOString(), toDate: atMinutes(addDays(today, 1), 0).toISOString() };
}

/** My bookings (get-my-bookings) that are still on for today: waiting or approved. */
export function useTodayMeetings() {
  const connected = useSessionStore((s) => s.connected.room);
  const window = todayWindow();
  return useQuery({
    queryKey: qk.bookings.mine({ ...window, scope: 'home-today' }),
    queryFn: () => bookingsApi.mine({ pageNumber: 1, pageSize: 50, ...window }),
    enabled: connected,
    select: (page) =>
      page.items
        .filter((b) => b.status === BookingStatus.Waiting || b.status === BookingStatus.Approved)
        .sort((a, b) => (a.from ?? '').localeCompare(b.from ?? '')),
  });
}

/**
 * My meeting that is live or next today (approved or still waiting; `bookings` sorted by start),
 * and how many more follow it. Only an approved meeting can be live.
 */
export function pickNextMeeting(bookings: BookingDto[] | undefined, now = new Date()) {
  const upcoming = (bookings ?? []).filter((b) => (bookingTo(b)?.getTime() ?? 0) > now.getTime());
  const next = upcoming.find((b) => b.status === BookingStatus.Approved && (bookingFrom(b)?.getTime() ?? Infinity) <= now.getTime()) ?? upcoming[0];
  if (!next) return null;
  const live = next.status === BookingStatus.Approved && (bookingFrom(next)?.getTime() ?? Infinity) <= now.getTime();
  return { booking: next, live, later: upcoming.length - 1 };
}

export function useMeetingsTodaySummary(): Signal<string> {
  const { t } = useTranslation();
  const meetings = useTodayMeetings();
  const count = meetings.data?.length;
  return {
    data: count === undefined ? undefined : count ? t('home.summary.meetingsToday', { count }) : t('home.summary.noMeetingsToday'),
    isLoading: meetings.isLoading,
  };
}

/** Rooms of my default area that are open and not taken right now. */
export function useFreeRoomsSummary(): Signal<string> {
  const { t } = useTranslation();
  const enabled = useCardsVisible();
  const areaId = useDefaultAreaId();
  const rooms = useRooms(enabled ? areaId : undefined);
  const schedule = useSchedule({ ...todayWindow(), areaId }, enabled);
  if (!enabled || !areaId) return { data: t('home.summary.bookRoom'), isLoading: false };
  if (!rooms.data || !schedule.data) return { data: undefined, isLoading: rooms.isLoading || schedule.isLoading };

  const now = new Date();
  const nowMin = minutesOfDay(now);
  const free = rooms.data.filter((room) => {
    const open = parseTimeOfDay(room.openedAt) ?? 0;
    const close = parseTimeOfDay(room.closedAt) ?? 24 * 60;
    if (nowMin < open || nowMin >= close) return false;
    return !schedule.data.some((b) => {
      if (!sameId(b.roomId ?? b.room?.id, room.id)) return false;
      // A pending booking only blocks rooms that refuse overlapping requests.
      const blocking = b.status === BookingStatus.Approved || (b.status === BookingStatus.Waiting && room.isDisableOverlappingTimes);
      const from = bookingFrom(b)?.getTime() ?? 0;
      const to = bookingTo(b)?.getTime() ?? 0;
      return blocking && from <= now.getTime() && now.getTime() < to;
    });
  }).length;
  return { data: free ? t('home.summary.freeRooms', { count: free }) : t('home.summary.noFreeRooms'), isLoading: false };
}

// ── Approvals ───────────────────────────────────────────────────────────────

export function usePendingApprovals(): Signal<number> {
  const stats = useApprovalStats();
  return { data: stats.data?.pendingApprovalsForUser, isLoading: stats.isLoading };
}

export function usePendingApprovalsSummary(): Signal<string> {
  const { t } = useTranslation();
  const pending = usePendingApprovals();
  return {
    data: pending.data === undefined ? undefined : pending.data ? t('home.summary.approvalsPending', { count: pending.data }) : t('home.summary.approvalsNone'),
    isLoading: pending.isLoading,
  };
}

// ── Parcels ─────────────────────────────────────────────────────────────────

export function useWaitingParcels(): Signal<number> {
  const stats = useMyParcelStats();
  return { data: stats.data?.waiting, isLoading: stats.isLoading };
}

/** "2 chờ · 1 quá hạn" or "2 chờ · 1 đến hạn". `waiting` already includes the Due ones. */
export function useParcelSummary(): Signal<string> {
  const { t } = useTranslation();
  const connected = useSessionStore((s) => s.connected.parcel);
  const enabled = useCardsVisible();
  const stats = useMyParcelStats();
  const due = useQuery({
    queryKey: qk.parcels.my({ statuses: [ParcelStatus.Due], countOnly: true }),
    queryFn: () => parcelsApi.my({ pageNumber: 1, pageSize: 1, statuses: [ParcelStatus.Due] }),
    enabled: connected && enabled,
    select: (page) => page.totalCount,
  });
  const s = stats.data;
  if (!s) return { data: undefined, isLoading: stats.isLoading };
  if (!s.waiting && !s.overdue) return { data: t('home.summary.parcelsNone'), isLoading: false };
  // Two parts at most so the line fits a half-width card; overdue outranks due.
  const parts = [
    s.waiting ? t('home.summary.parcelsWaiting', { count: s.waiting }) : null,
    s.overdue ? t('home.summary.parcelsOverdue', { count: s.overdue }) : due.data ? t('home.summary.parcelsDue', { count: due.data }) : null,
  ];
  return { data: parts.filter(Boolean).join(' · '), isLoading: false };
}

/** Delegations waiting for me (as the delegate) to accept or decline. */
export function useDelegationsAwaitingMe(): Signal<number> {
  const me = useParcelMe();
  const delegations = useMyDelegations();
  if (!delegations.data || !me.data) return { data: undefined, isLoading: delegations.isLoading || me.isLoading };
  return {
    data: delegations.data.filter((d) => sameId(d.delegatorId, me.data.id) && d.status === DelegationStatus.Waiting).length,
    isLoading: false,
  };
}

export function useDelegationSummary(): Signal<string> {
  const { t } = useTranslation();
  const me = useParcelMe();
  const delegations = useMyDelegations();
  const awaiting = useDelegationsAwaitingMe();
  if (awaiting.data === undefined) return { data: undefined, isLoading: awaiting.isLoading };
  if (awaiting.data) return { data: t('home.summary.delegationsAwaiting', { count: awaiting.data }), isLoading: false };
  const active = (delegations.data ?? []).filter(
    (d) => sameId(d.authorizerId, me.data?.id) && (d.status === DelegationStatus.Active || d.status === DelegationStatus.DueSoon),
  ).length;
  return { data: active ? t('home.summary.delegationsActive', { count: active }) : t('home.summary.delegationsNone'), isLoading: false };
}

/** Reception desk: parcels of my units still waiting for hand-over. */
export function useReceptionSummary(): Signal<string> {
  const { t } = useTranslation();
  const { has } = useCapabilities();
  const enabled = useCardsVisible() && has('parcel.reception');
  const stats = useReceptionStats({}, enabled);
  if (!enabled) return { data: t('home.summary.reception'), isLoading: false };
  const waiting = stats.data?.waiting;
  return {
    data: waiting === undefined ? undefined : waiting ? t('home.summary.receptionWaiting', { count: waiting }) : t('home.summary.receptionNone'),
    isLoading: stats.isLoading,
  };
}
