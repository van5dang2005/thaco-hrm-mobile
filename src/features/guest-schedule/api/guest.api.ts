import { isApiError } from '@/core/api/ApiError';
import { guestScheduleApi } from '@/core/api/clients';

import { type GuestCheckIn, type GuestCheckInInput, GuestError, type GuestScheduleDto, type GuestVisit } from '../types';
import { qrCodeOf, toVisit } from '../utils/visit';

/** Mobile endpoints of the guest-schedule back-end, keyed by the code a guest QR holds. */
const qrPath = (qrCode: string) => `/api/GuestSchedules/mobile/qr/${encodeURIComponent(qrCode)}`;

/**
 * A wrong or ended visit as the guard should read it; anything else (network, server, rights) stays as thrown.
 * The API has no documented error codes yet, so this goes by status and wording. "Invalid" wording only means a
 * wrong code on the lookup: on check-in it may be about the form (head count, time).
 */
function asGuestError(error: unknown, step: 'lookup' | 'checkIn'): unknown {
  if (!isApiError(error)) return error;
  const said = `${error.errorCode} ${error.message}`.toLowerCase();
  if (/expired|hết hạn|đã kết thúc/.test(said)) return new GuestError('GUEST_VISIT_EXPIRED');
  if (error.status === 404 || (step === 'lookup' && /not_?found|invalid|không tìm thấy|không hợp lệ/.test(said))) return new GuestError('GUEST_QR_INVALID');
  return error;
}

export const guestApi = {
  /** The visit a scanned QR points to: `GET …/mobile/qr/{code}`. */
  async lookup(qr: string): Promise<GuestVisit> {
    const qrCode = qrCodeOf(qr);
    if (!qrCode) throw new GuestError('GUEST_QR_INVALID');
    let dto: GuestScheduleDto | null;
    try {
      dto = await guestScheduleApi.get<GuestScheduleDto | null>(qrPath(qrCode));
    } catch (error) {
      throw asGuestError(error, 'lookup');
    }
    const visit = toVisit(dto, qrCode);
    if (!visit) throw new GuestError('GUEST_QR_INVALID');
    return visit;
  },

  /** Records the group passing the gate: `POST …/mobile/qr/{code}/check-in` with `{ time, actualAmount, note }`. */
  async checkIn(input: GuestCheckInInput, visit: GuestVisit): Promise<GuestCheckIn> {
    try {
      await guestScheduleApi.post<unknown>(`${qrPath(visit.qrCode)}/check-in`, {
        // UTC, as the API returns its own times.
        time: input.checkInAt,
        actualAmount: input.actualGuestCount,
        note: input.note,
      });
    } catch (error) {
      throw asGuestError(error, 'checkIn');
    }
    return { ...input, visit };
  },
};
