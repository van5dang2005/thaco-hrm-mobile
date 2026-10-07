import { roomApi } from '@/core/api/clients';
import type { Paginated } from '@/core/api/types';
import type { RoomDepartment, RoomUser } from '@/core/session/userTypes';
import { appendLocalFile, type LocalFile } from '@/shared/lib/upload';

import type { AreaDetail, BookingDto, RecurrenceType, RoomDto, ApprovalWorkflowDto, ApprovalStepDto } from './types';

export type ScheduleQuery = {
  fromDate: string;
  toDate: string;
  areaId?: string;
  departmentId?: string;
  status?: number;
  search?: string;
};

export type BookingFile = LocalFile;

export type BookingParticipantInput = { userId: string; isHost: boolean; isPrepareContent: boolean };

export type BookingFormInput = {
  roomId: string;
  /** UTC ISO. The date part of from/to spans the series, the time part is the daily slot. */
  from: string;
  to: string;
  content?: string;
  participant?: string;
  phoneNumber?: string;
  numberOfParticipants?: number;
  isConfidentialContent?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
  serviceIds: string[];
  participants: BookingParticipantInput[];
  files: BookingFile[];
  links: string[];
  /** Update only. */
  isUpdateSingleDay?: boolean;
  attachmentIds?: string[];
};

function toBookingForm(input: BookingFormInput) {
  const form = new FormData();
  const scalar: [string, string | number | boolean | undefined][] = [
    ['roomId', input.roomId],
    ['from', input.from],
    ['to', input.to],
    ['content', input.content],
    ['participant', input.participant],
    ['phoneNumber', input.phoneNumber],
    ['numberOfParticipants', input.numberOfParticipants],
    ['isConfidentialContent', input.isConfidentialContent],
    ['recurrenceType', input.recurrenceType],
    ['recurrenceInterval', input.recurrenceInterval],
    ['isUpdateSingleDay', input.isUpdateSingleDay],
  ];
  scalar.forEach(([key, value]) => {
    if (value !== undefined && value !== '') form.append(key, String(value));
  });
  input.serviceIds.forEach((id) => form.append('serviceIds', id));
  input.links.forEach((link) => form.append('links', link));
  input.attachmentIds?.forEach((id) => form.append('attachmentIds', id));
  // ASP.NET binds List<ParticipantItemDto> from indexed dotted keys.
  input.participants.forEach((p, i) => {
    form.append(`participants[${i}].userId`, p.userId);
    form.append(`participants[${i}].isHost`, String(p.isHost));
    form.append(`participants[${i}].isPrepareContent`, String(p.isPrepareContent));
  });
  input.files.forEach((file) => appendLocalFile(form, 'attachments', file));
  return form;
}

export const roomsApi = {
  areas: () => roomApi.get<Paginated<AreaDetail>>('/api/areas', { query: { pageNumber: 1, pageSize: 200 } }),
  /** Full department list (parentId) to evaluate cross-level booking restrictions; may be permission-filtered. */
  departments: () => roomApi.get<Paginated<RoomDepartment>>('/api/departments', { query: { pageNumber: 1, pageSize: 5000 } }),
  departmentsWithRooms: (areaId?: string) => roomApi.get<RoomDepartment[]>('/api/departments/get-departments-has-room', { query: { areaId } }),
  rooms: (areaId?: string, departmentId?: string) => roomApi.get<RoomDto[]>('/api/rooms/get-all-rooms', { query: { areaId, departmentId } }),
  /** Free rooms in a window among those where I am an approver (used when approving with a room change). */
  availableRooms: (q: { areaId?: string; departmentId?: string; startTime: string; endTime: string }) =>
    roomApi.get<RoomDto[]>('/api/rooms/get-available-rooms', { query: q }),
  workflows: () => roomApi.get<Paginated<ApprovalWorkflowDto>>('/api/approvalworkflows', { query: { pageNumber: 1, pageSize: 500 } }),
  workflowSteps: (workflowId: string) => roomApi.get<ApprovalStepDto[]>(`/api/approvalsteps/workflow/${workflowId}`),
  searchUsers: (keyword: string) =>
    roomApi.get<Paginated<RoomUser>>('/api/users', { query: { searchKeyword: keyword, pageNumber: 1, pageSize: 20 } }),
};

export const bookingsApi = {
  /** Not paginated; defaults server-side to today → +1 day. */
  schedule: (q: ScheduleQuery) => roomApi.get<BookingDto[]>('/api/bookings/get-all-bookings', { query: q }),
  mine: (q: { pageNumber: number; pageSize: number; fromDate?: string; toDate?: string; status?: number; search?: string }) =>
    roomApi.get<Paginated<BookingDto>>('/api/bookings/get-my-bookings', { query: q }),
  detail: (id: string) => roomApi.get<BookingDto>(`/api/bookings/${id}`),
  createMultiDay: (input: BookingFormInput) => roomApi.postForm<BookingDto[]>('/api/bookings/multi-day', toBookingForm(input)),
  updateGroup: (id: string, groupId: string, input: BookingFormInput) =>
    roomApi.putForm<BookingDto>(`/api/bookings/${id}/group/${groupId}`, toBookingForm(input)),
  cancel: (id: string, reason: string) => roomApi.put<void>(`/api/bookings/${id}/cancel`, { reason }),
  /** `curentTime` is misspelled on the server; keep it. */
  extend: (id: string, newEndTime: string) => roomApi.put<BookingDto>(`/api/bookings/${id}/extend`, { newEndTime, curentTime: new Date().toISOString() }),
  complete: (id: string, newEndTime: string) => roomApi.put<BookingDto>(`/api/bookings/${id}/complete`, { newEndTime }),
  attachmentDownloadUrl: (bookingId: string, attachmentId: string) => roomApi.url(`/api/bookings/${bookingId}/attachments/${attachmentId}/download`),
};
