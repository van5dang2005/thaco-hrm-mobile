import { atMinutes, todayKey } from '@/core/time/vn';

import type { GuestDashboard, GuestScheduleItem, GuestVisitStatus } from '../types';

type Seed = Omit<GuestScheduleItem, 'from' | 'to' | 'status'> & {
  /** Minutes of the day. */
  from: number;
  to: number;
  /** Confirmed by the host; an unconfirmed visit stays "Chờ xác nhận". */
  confirmed: boolean;
};

const seeds: Seed[] = [
  { id: 'mock-1', groupName: 'Đoàn KIA Hàn Quốc', company: 'Công ty TNHH Sản xuất ô tô KIA', host: 'Phòng Kinh doanh quốc tế', guestCount: 4, from: 8 * 60 + 30, to: 10 * 60, confirmed: true },
  { id: 'mock-2', groupName: 'Đối tác Stellantis', company: 'Công ty TNHH Peugeot Việt Nam', host: 'Ban Phát triển sản phẩm', guestCount: 3, from: 10 * 60 + 30, to: 11 * 60 + 30, confirmed: true },
  { id: 'mock-3', groupName: 'Chuyên gia Mazda Nhật Bản', company: 'Công ty TNHH MTV Sản xuất ô tô Mazda', host: 'Nhà máy Mazda Chu Lai', guestCount: 5, from: 13 * 60 + 30, to: 16 * 60, confirmed: true },
  { id: 'mock-4', groupName: 'Sinh viên ĐH Bách khoa Đà Nẵng', company: 'Trường Đại học Bách khoa', host: 'Phòng Nhân sự', guestCount: 12, from: 14 * 60, to: 15 * 60 + 30, confirmed: false },
  { id: 'mock-5', groupName: 'Đoàn nhà cung cấp', company: 'Công ty TNHH Linh kiện Ô tô', host: 'Phòng Mua hàng', guestCount: 8, from: 16 * 60, to: 17 * 60 + 30, confirmed: false },
];

/** Follows the clock so the day reads true: a confirmed group is inside during its slot and gone after it. */
function statusAt(confirmed: boolean, from: Date, to: Date, now: Date): GuestVisitStatus {
  if (!confirmed) return 'pending';
  if (now >= to) return 'checkedOut';
  return now >= from ? 'checkedIn' : 'confirmed';
}

/** Hard-coded dashboard until the guest-schedule back-end has an endpoint for it. */
export function dashboardSeed(now = new Date()): GuestDashboard {
  const day = todayKey(now);
  const today = seeds.map(({ confirmed, from: start, to: end, ...visit }): GuestScheduleItem => {
    const from = atMinutes(day, start);
    const to = atMinutes(day, end);
    return { ...visit, from: from.toISOString(), to: to.toISOString(), status: statusAt(confirmed, from, to, now) };
  });
  return { stats: { total: 24, pending: 5, confirmed: 19 }, today };
}
