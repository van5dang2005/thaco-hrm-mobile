/** Mirrors thaco_be_ql_buu_pham Domain/Common/Enums and Application/DTOs. Enums are numeric on the wire. */

export enum ParcelStatus {
  Waiting = 1,
  Due = 2,
  Overdue = 3,
  Cancelled = 4,
  HandedOver = 5,
}

/** Note the numbering: Expired is 1 and Waiting is 5. */
export enum DelegationStatus {
  Expired = 1,
  DueSoon = 2,
  Active = 3,
  Rejected = 4,
  Waiting = 5,
}

export enum DelegationType {
  /** Time-bound, covers every parcel of the authorizer. */
  Default = 1,
  /** Bound to one parcel (`Specific` in the C# enum, "chi tiết" in the UI). */
  Specific = 2,
}

export enum MatchReason {
  Direct = 0,
  DetailedDelegation = 1,
  DefaultDelegation = 2,
}

export enum EmailStatus {
  Skip = 0,
  Successful = 1,
  Failed = 2,
}

export type ParcelAttachment = { id: string; fileName: string; filePath: string; parcelId?: string | null };

export type ParcelLog = {
  id: string;
  parcelId?: string | null;
  delegationId?: string | null;
  action: string;
  description?: string | null;
  performedBy: string;
  performedName: string;
  performedCode: string;
  performedDepartment?: string | null;
  isEmailSent?: boolean | null;
  emailStatus?: EmailStatus | null;
  createdAt: string;
};

export type RelatedUserSummary = {
  id: string;
  username: string;
  email: string;
  fullName?: string | null;
  employeeCode?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  unitName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  jobTitleName?: string | null;
  positionName?: string | null;
};

/**
 * Delegation currently governing a parcel's handover (detailed first, then default).
 * Naming trap: `authorizer*` = the person who delegates (parcel owner);
 * `delegator*` / `delegateCode` = the person who RECEIVES the delegation.
 */
export type RelatedDelegation = {
  id: string;
  authorizerId: string;
  authorizerCode: string;
  delegatorId: string;
  delegateCode: string;
  parcelId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: DelegationStatus;
  pendingEndDate?: string | null;
  delegator?: RelatedUserSummary | null;
  authorizer?: RelatedUserSummary | null;
};

export type ParcelDto = {
  id: string;
  transactionCode: string;
  /** `{sequence}_{carrier code}`; the sequence prefix cannot be edited. */
  trackingNumber: string;
  senderFullName: string;
  senderCompanyName?: string | null;
  senderPhoneNumber?: string | null;
  senderAddress?: string | null;
  receiverId: string;
  receiverCode: string;
  receiverFullName: string;
  receiverPhoneNumber?: string | null;
  receiverAvatarUrl?: string | null;
  departmentId: string;
  departmentName?: string | null;
  description?: string | null;
  note?: string | null;
  receivedAt?: string | null;
  createdAt?: string | null;
  handOverAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  actualReceiverCode?: string | null;
  status: ParcelStatus;
  attachments: ParcelAttachment[];
  relatedDelegation?: RelatedDelegation | null;
  logs: ParcelLog[];
};

/** Item of GET /api/parcels/my: no createdAt / cancelledAt, plus why it is in my list. */
export type ParcelLookupDto = Omit<ParcelDto, 'relatedDelegation' | 'createdAt' | 'cancelledAt' | 'cancellationReason'> & {
  createdAt?: string | null;
  matchReason: MatchReason;
  /** Owner of the parcel when I collect it on their behalf (null for Direct). */
  delegatorCode?: string | null;
  delegatorFullName?: string | null;
  delegationDepartmentName?: string | null;
  delegationAvatarUrl?: string | null;
};

export type ParcelStats = {
  total: number;
  /** Waiting + Due. */
  waiting: number;
  handedOver: number;
  overdue: number;
  cancelled: number;
};

export type DelegationUser = {
  id: string;
  username: string;
  email: string;
  fullname?: string | null;
  employeeCode?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  jobTitleName?: string | null;
};

export type DelegationDto = {
  id: string;
  authorizerId: string;
  authorizerCode: string;
  delegatorId: string;
  delegateCode: string;
  parcelId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: DelegationStatus;
  appliedType: DelegationType;
  /** Not in DelegationDto today (only in RelatedDelegation); read defensively. */
  pendingEndDate?: string | null;
  delegator?: DelegationUser | null;
  authorizer?: DelegationUser | null;
};

export type ParcelDepartment = {
  id: string;
  name?: string | null;
  code?: string | null;
  parentId?: string | null;
  level?: number | null;
  isActive?: boolean | null;
  fullPathName?: string | null;
  departmentConfig?: { departmentId?: string | null; requireApproval: boolean; isReportEnabled: boolean } | null;
};
