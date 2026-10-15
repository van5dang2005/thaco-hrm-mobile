import { addDays, atMinutes, todayKey } from '@/core/time/vn';

import { type GuestCheckIn, type GuestCheckInInput, GuestError, type GuestVisit } from '../types';

/*
 * MOCK until the guest-schedule back-end ships: same signatures as the real calls, canned data after a short
 * delay. Swap each body for a request to that back-end's client; the screens keep working unchanged.
 *
 * Test QRs: any text gives the sample visit (a registration-number-like text becomes its `code`); a JSON object
 * overrides the sample's fields (`{"code":"AUT…","groupName":"…","guestCount":6}`); "INVALID…" and
 * "EXPIRED…" give the two errors.
 */

const LATENCY_MS = 600;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const REGISTRATION_CODE = /^[A-Z]{2,5}\d{6,}$/i;

function sampleVisit(): GuestVisit {
  const today = todayKey();
  return {
    id: 'mock-visit-1',
    code: 'AUT01020260002',
    groupName: 'Đoàn KIA Hàn Quốc',
    purpose: 'Khảo sát dây chuyền lắp ráp',
    guestCount: 4,
    fromDate: atMinutes(today, 8 * 60).toISOString(),
    toDate: atMinutes(addDays(today, 3), 17 * 60).toISOString(),
    location: 'Phòng họp số 1 - Tòa nhà THACO',
  };
}

/** The QR's fields when it holds a JSON object. */
function jsonFields(text: string): Partial<GuestVisit> | null {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<GuestVisit>) : null;
  } catch {
    return null;
  }
}

export const guestApi = {
  /** The visit a scanned QR points to. */
  async lookup(qr: string): Promise<GuestVisit> {
    await delay(LATENCY_MS);
    const text = qr.trim();
    if (!text || /^invalid/i.test(text)) throw new GuestError('GUEST_QR_INVALID');
    if (/^expired/i.test(text)) throw new GuestError('GUEST_VISIT_EXPIRED');
    const sample = sampleVisit();
    const fields = jsonFields(text);
    if (fields) return { ...sample, ...fields };
    return REGISTRATION_CODE.test(text) ? { ...sample, code: text.toUpperCase() } : sample;
  },

  /** Records the group passing the gate. */
  async checkIn(input: GuestCheckInInput, visit: GuestVisit): Promise<GuestCheckIn> {
    await delay(LATENCY_MS);
    return { ...input, id: `mock-check-in-${Date.now()}`, visit };
  },
};
