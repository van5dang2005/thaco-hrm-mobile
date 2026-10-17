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

/** Where a visit stands on the dashboard: waiting for the host's confirmation, confirmed, inside, gone. */
export type GuestVisitStatus = 'pending' | 'confirmed' | 'checkedIn' | 'checkedOut';

/** A visit in the dashboard's "Lịch khách hôm nay" list. */
export type GuestScheduleItem = {
  id: string;
  /** "Đoàn KIA Hàn Quốc". */
  groupName: string;
  /** The guests' company. */
  company?: string | null;
  /** Who receives them: the host unit or person. */
  host?: string | null;
  /** ISO, UTC. */
  from: string;
  to: string;
  guestCount: number;
  status: GuestVisitStatus;
};

/** "Quản lý lịch khách" dashboard: the counters and today's visits. */
export type GuestDashboard = {
  stats: { total: number; pending: number; confirmed: number };
  today: GuestScheduleItem[];
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
