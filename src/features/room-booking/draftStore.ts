import { create } from 'zustand';

import type { RoomUser } from '@/core/session/userTypes';
import { addDays, atMinutes, ceilToStep, diffDays, minutesOfDay, todayKey, toDateKey, type DateKey } from '@/core/time/vn';

import type { BookingFile, BookingFormInput } from './api';
import { bookingFrom, bookingTo, sessionDates, type Recurrence } from './logic';
import { AttachmentType, BookingStatus, RecurrenceType, type BookingAttachment, type BookingDto } from './types';

export type DraftParticipant = { user: RoomUser; isHost: boolean; isPrepareContent: boolean };

export type BookingDraft = {
  mode: 'create' | 'edit';
  edit?: { bookingId: string; groupId: string; scope: 'single' | 'series' };
  areaId?: string;
  /** First session (Vietnam date). */
  dateKey: DateKey;
  startMin: number;
  endMin: number;
  people: number;
  recurrence: Recurrence;
  interval: number;
  /** Last day of the repeat range. */
  untilKey: DateKey;
  roomId?: string;
  content: string;
  confidential: boolean;
  participants: DraftParticipant[];
  participantText: string;
  phone: string;
  serviceIds: string[];
  files: BookingFile[];
  links: string[];
  /** Edit: documents already on the booking that should be kept. */
  keptAttachments: BookingAttachment[];
};


export function defaultDraft(now = new Date()): BookingDraft {
  let dateKey = todayKey(now);
  let start = Math.max(8 * 60, ceilToStep(minutesOfDay(now) + 15, 30));
  if (start > 17 * 60) {
    dateKey = addDays(dateKey, 1);
    start = 8 * 60;
  }
  return {
    mode: 'create',
    dateKey,
    startMin: start,
    endMin: start + 60,
    people: 2,
    recurrence: 'none',
    interval: 1,
    untilKey: addDays(dateKey, 28),
    content: '',
    confidential: false,
    participants: [],
    participantText: '',
    phone: '',
    serviceIds: [],
    files: [],
    links: [],
    keptAttachments: [],
  };
}

/** Recurrence of an existing series, inferred from the dates of its pending sessions. */
export function inferRecurrence(dates: DateKey[]): { recurrence: Recurrence; interval: number } {
  if (dates.length < 2) return { recurrence: 'none', interval: 1 };
  const gaps = dates.slice(1).map((d, i) => diffDays(dates[i], d));
  if (gaps.every((g) => g % 7 === 0) && new Set(gaps).size === 1) return { recurrence: 'weekly', interval: gaps[0] / 7 };
  const smallest = Math.min(...gaps);
  return { recurrence: 'daily', interval: Math.max(1, smallest) };
}

export function draftFromBooking(b: BookingDto, scope: 'single' | 'series', groupSessions: BookingDto[]): BookingDraft {
  const from = bookingFrom(b) ?? new Date();
  const to = bookingTo(b) ?? new Date();
  const pendingDays = groupSessions
    .filter((s) => s.status === BookingStatus.Waiting)
    .map((s) => toDateKey(bookingFrom(s) ?? from))
    .sort();
  const series = scope === 'series' && pendingDays.length > 1;
  const { recurrence, interval } = series ? inferRecurrence(pendingDays) : { recurrence: 'none' as const, interval: 1 };
  return {
    mode: 'edit',
    edit: { bookingId: b.id, groupId: b.groupId ?? b.id, scope },
    areaId: b.room?.areaId ?? b.room?.area?.id ?? undefined,
    dateKey: series ? pendingDays[0] : toDateKey(from),
    startMin: minutesOfDay(from),
    endMin: minutesOfDay(to),
    people: b.numberOfParticipants ?? 1,
    recurrence,
    interval,
    untilKey: series ? pendingDays[pendingDays.length - 1] : toDateKey(from),
    roomId: b.roomId ?? b.room?.id ?? undefined,
    content: b.content ?? '',
    confidential: !!b.isConfidentialContent,
    participants: (b.participants ?? [])
      .filter((p) => p.user)
      .map((p) => ({ user: p.user!, isHost: !!p.isHost, isPrepareContent: !!p.isPrepareContent })),
    participantText: b.participant ?? '',
    phone: b.phoneNumber ?? '',
    serviceIds: (b.services ?? []).map((s) => s.id),
    files: [],
    // Existing links are re-sent as links[]; existing files are kept through attachmentIds[].
    links: (b.attachments ?? []).filter((a) => a.type === AttachmentType.Link).map((a) => a.path ?? a.name ?? '').filter(Boolean),
    keptAttachments: (b.attachments ?? []).filter((a) => a.type !== AttachmentType.Link),
  };
}

export function draftSessions(d: Pick<BookingDraft, 'dateKey' | 'untilKey' | 'recurrence' | 'interval'>) {
  return sessionDates(d.dateKey, d.recurrence === 'none' ? d.dateKey : d.untilKey, d.recurrence, d.interval);
}

/** Form payload for POST multi-day / PUT group: from/to carry the date span and the daily slot. */
export function draftToForm(d: BookingDraft): BookingFormInput {
  const sessions = draftSessions(d);
  const lastDay = sessions[sessions.length - 1];
  return {
    roomId: d.roomId!,
    from: atMinutes(d.dateKey, d.startMin).toISOString(),
    to: atMinutes(d.recurrence === 'none' ? d.dateKey : lastDay, d.endMin).toISOString(),
    content: d.content.trim(),
    participant: d.participantText.trim() || undefined,
    phoneNumber: d.phone.trim() || undefined,
    numberOfParticipants: d.people,
    isConfidentialContent: d.confidential,
    recurrenceType: d.recurrence === 'weekly' ? RecurrenceType.Weekly : RecurrenceType.Daily,
    recurrenceInterval: d.recurrence === 'none' ? 1 : d.interval,
    serviceIds: d.serviceIds,
    participants: d.participants.map((p) => ({ userId: p.user.id, isHost: p.isHost, isPrepareContent: p.isPrepareContent })),
    files: d.files,
    links: d.links,
    isUpdateSingleDay: d.mode === 'edit' ? d.edit?.scope === 'single' : undefined,
    attachmentIds: d.mode === 'edit' ? d.keptAttachments.map((a) => a.id) : undefined,
  };
}

type DraftState = {
  draft: BookingDraft;
  start: (draft: BookingDraft) => void;
  patch: (partial: Partial<BookingDraft>) => void;
  reset: () => void;
};

export const useBookingDraft = create<DraftState>((set) => ({
  draft: defaultDraft(),
  start: (draft) => set({ draft }),
  patch: (partial) => set((state) => ({ draft: { ...state.draft, ...partial } })),
  reset: () => set({ draft: defaultDraft() }),
}));
