import { roomApi } from '@/core/api/clients';
import type { Paginated } from '@/core/api/types';
import type { ApprovalFilter, ApprovalStats, BookingApprovalHandlerDto } from '@/features/room-booking/types';

export const approvalsApi = {
  stats: () => roomApi.get<ApprovalStats>('/api/dashboard/approval-stats'),
  /** One row per booking group; see BookingApprovalHandlerDto. */
  inbox: (q: { status: ApprovalFilter; pageNumber: number; pageSize: number; search?: string; fromDate?: string; toDate?: string }) =>
    roomApi.get<Paginated<BookingApprovalHandlerDto>>('/api/bookingapprovals/my-approvals', { query: q }),
  /** Every approver row created so far for a booking (approval-type steps only). */
  forBooking: (bookingId: string) => roomApi.get<BookingApprovalHandlerDto[]>(`/api/bookingapprovals/booking/${bookingId}`),
  approve: (bookingId: string, body: { roomId?: string; numberOfParticipants?: number; comment?: string; isUpdateSingleDay: boolean }) =>
    roomApi.post<boolean>(`/api/bookingapprovals/booking/${bookingId}/approve`, body),
  reject: (bookingId: string, body: { comment?: string; isUpdateSingleDay: boolean }) =>
    roomApi.post<boolean>(`/api/bookingapprovals/booking/${bookingId}/reject`, body),
  undo: (bookingId: string, isUpdateSingleDay: boolean) =>
    roomApi.post<boolean>(`/api/bookingapprovals/booking/${bookingId}/undo-approval`, { isUpdateSingleDay, curentTime: new Date().toISOString() }),
  approveGroups: (bookingGroupIds: string[], comment?: string) =>
    roomApi.post<boolean>('/api/bookingapprovals/booking-group/approve', { bookingGroupIds, comment }),
  rejectGroups: (bookingGroupIds: string[], comment?: string) =>
    roomApi.post<boolean>('/api/bookingapprovals/booking-group/reject', { bookingGroupIds, comment }),
};
