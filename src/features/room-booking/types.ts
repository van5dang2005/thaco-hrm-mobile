/** Mirrors thaco_be_ql_phong_hop Domain/Common/Enums and Application/DTOs. */
import type { RoomArea, RoomDepartment, RoomUser } from '@/core/session/userTypes';

export enum BookingStatus {
  Waiting = 1,
  Approved = 2,
  Rejected = 3,
  Finished = 4,
  Canceled = 5,
}

export enum RecurrenceType {
  Daily = 1,
  Weekly = 7,
}

export enum ApprovalActionType {
  Approve = 1,
  /** Receives a notification only. */
  Notify = 2,
}

/** `status` query of GET /api/bookingapprovals/my-approvals. */
export enum ApprovalFilter {
  All = 0,
  Approved = 1,
  Rejected = 2,
  Pending = 3,
  Processed = 4,
}

export enum AttachmentType {
  File = 1,
  Link = 2,
}

export type ServiceDto = { id: string; name: string; code: string; isActive: boolean };

export type AreaDetail = RoomArea & { departments?: RoomDepartment[] | null };

export type RoomDto = {
  id: string;
  name?: string | null;
  code?: string | null;
  code2?: string | null;
  numberOfSeats?: number | null;
  priority?: number | null;
  areaId?: string | null;
  areaName?: string | null;
  isActive?: boolean | null;
  /** "HH:mm:ss", Vietnam wall time (as the web app treats it). */
  openedAt?: string | null;
  closedAt?: string | null;
  departmentId?: string | null;
  isDisableOverlappingTimes?: boolean | null;
  isDisableCrossLevelDepartment?: boolean | null;
  isDisableCrossLevelArea?: boolean | null;
  isDisableSubscriberCancel?: boolean | null;
  isSendEmailToApprover?: boolean | null;
  isDayLimited?: boolean | null;
  maxAdvanceRegistrationDays?: number | null;
  services?: ServiceDto[] | null;
  area?: RoomArea | null;
};

export type ParticipantDto = {
  id: string;
  bookingId?: string | null;
  userId?: string | null;
  isHost?: boolean | null;
  isPrepareContent?: boolean | null;
  user?: RoomUser | null;
};

export type BookingAttachment = {
  id: string;
  bookingId?: string | null;
  type?: AttachmentType | null;
  path?: string | null;
  name?: string | null;
  createdAt?: string | null;
};

export type BookingDto = {
  id: string;
  roomId?: string | null;
  groupId?: string | null;
  code?: string | null;
  from?: string | null;
  to?: string | null;
  status?: BookingStatus | null;
  content?: string | null;
  participant?: string | null;
  phoneNumber?: string | null;
  numberOfParticipants?: number | null;
  isConfidentialContent?: boolean | null;
  /** Only filled by GET /api/bookings/{id}. */
  isSingleBooking?: boolean | null;
  reason?: string | null;
  createdAt?: string | null;
  user?: RoomUser | null;
  room?: RoomDto | null;
  services?: ServiceDto[] | null;
  attachments?: BookingAttachment[] | null;
  participants?: ParticipantDto[] | null;
};

export type ApprovalStepDto = {
  id: string;
  name?: string | null;
  workflowId?: string | null;
  order?: number | null;
  actionType?: ApprovalActionType | null;
  isActive?: boolean | null;
  approvalHandlers?: ApprovalHandlerDto[] | null;
};

export type ApprovalHandlerDto = {
  id: string;
  stepId?: string | null;
  userId?: string | null;
  user?: RoomUser | null;
  approvalStep?: Omit<ApprovalStepDto, 'approvalHandlers'> | null;
};

export type ApprovalWorkflowDto = {
  id: string;
  name?: string | null;
  roomId?: string | null;
  description?: string | null;
  isActive?: boolean | null;
  approvalSteps?: ApprovalStepDto[] | null;
};

/**
 * One approver's row for a booking. In my-approvals the rows are aggregated per group:
 * `booking.from` is the first session and `booking.to` the last one, and `approvalStep` is null.
 */
export type BookingApprovalHandlerDto = {
  id: string;
  approvalHandlerId: string;
  isApproved?: boolean | null;
  processedAt?: string | null;
  processedBy?: string | null;
  comment?: string | null;
  booking?: BookingDto | null;
  approvalHandler?: ApprovalHandlerDto | null;
  status?: 'Pending' | 'Approved' | 'Rejected' | null;
};

export type ApprovalStats = {
  pendingApprovalsForUser: number;
  pendingBookingsOfUser: number;
  completedApprovalsOfUser: number;
  totalBookingsOfUser: number;
  totalAll: number;
  bookingsToday: number;
};
