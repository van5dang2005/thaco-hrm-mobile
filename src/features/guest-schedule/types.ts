/** `GET /api/GuestSchedules/mobile/qr/{qrCode}`: the fields the app reads (times are UTC). */
export type GuestScheduleDto = {
  guestScheduleId: string;
  /** Registration number, e.g. `AUTO1020260003`. */
  guestCode?: string | null;
  /** "Khách hàng Malaysia - Đàm phán xe tải". */
  guestName?: string | null;
  guestCount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  purpose?: string | null;
  /** Units that receive the guests. */
  workingUnits?: { workingUnitId: string; workingUnitName?: string | null }[] | null;
  members?: { memberId: string; fullName?: string | null }[] | null;
};

/** A guest visit registration, what a guest QR points to. */
export type GuestVisit = {
  id: string;
  /** The code the QR holds; the check-in posts to the same link. */
  qrCode: string;
  /** Registration number, e.g. `AUTO1020260003`. */
  code?: string;
  /** "Khách hàng Malaysia - Đàm phán xe tải". */
  groupName: string;
  /** "Đàm phán hợp đồng xuất khẩu xe tải sang Malaysia". */
  purpose?: string | null;
  /** Registered number of guests. */
  guestCount: number;
  /** Working period of the visit (ISO, UTC; empty when the API gives none). */
  fromDate: string;
  toDate: string;
  /** Where the guests are received: the receiving units, "Công ty TNHH MTV Sản xuất và Lắp ráp xe tải THACO". */
  location?: string | null;
};

/** A gate check-in (the guard confirms the group at the gate). */
export type GuestCheckInInput = {
  /** ISO, UTC. */
  checkInAt: string;
  actualGuestCount: number;
  note?: string;
};

export type GuestCheckIn = GuestCheckInInput & { visit: GuestVisit };

/** What a failed lookup or check-in means for the guard, read from the API's status and message. */
export type GuestErrorCode = 'GUEST_QR_INVALID' | 'GUEST_VISIT_EXPIRED';

export class GuestError extends Error {
  readonly code: GuestErrorCode;

  constructor(code: GuestErrorCode) {
    super(code);
    this.name = 'GuestError';
    this.code = code;
  }
}
