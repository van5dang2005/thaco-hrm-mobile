/** A guest visit registration, what a guest QR points to. Shape agreed ahead of the guest-schedule API. */
export type GuestVisit = {
  id: string;
  /** Registration number, e.g. `AUT01020260002`. */
  code: string;
  /** "Đoàn KIA Hàn Quốc". */
  groupName: string;
  /** "Khảo sát dây chuyền lắp ráp". */
  purpose?: string | null;
  /** Registered number of guests. */
  guestCount: number;
  /** Working period of the visit (ISO, UTC). */
  fromDate: string;
  toDate: string;
  /** Where the guests are received: "Phòng họp số 1 - Tòa nhà THACO". */
  location?: string | null;
};

/** Body of a gate check-in (the guard confirms the group at the gate). */
export type GuestCheckInInput = {
  visitId: string;
  /** ISO, UTC. */
  checkInAt: string;
  actualGuestCount: number;
  note?: string;
};

export type GuestCheckIn = GuestCheckInInput & { id: string; visit: GuestVisit };

/** Business error codes of the guest API. */
export type GuestErrorCode = 'GUEST_QR_INVALID' | 'GUEST_VISIT_EXPIRED';

export class GuestError extends Error {
  readonly code: GuestErrorCode;

  constructor(code: GuestErrorCode) {
    super(code);
    this.name = 'GuestError';
    this.code = code;
  }
}
