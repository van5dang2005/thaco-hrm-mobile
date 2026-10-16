import type { GuestScheduleDto } from '../../types';
import { qrCodeOf, toVisit, visitPhase } from '../visit';

const CODE = '0807954103354f829a1375e0e0cb138e';

/** Shaped like the UAT response of `GET /api/GuestSchedules/mobile/qr/{code}`. */
const dto: GuestScheduleDto = {
  guestScheduleId: '35a1f640-d91e-4e4b-a62b-0ff16ce246d6',
  guestCode: 'AUTO1020260003',
  guestName: 'Đoàn khách mẫu',
  guestCount: 2,
  startDate: '2026-10-20T00:00:00Z',
  endDate: '2026-10-23T00:00:00Z',
  purpose: 'Đàm phán hợp đồng',
  workingUnits: [
    { workingUnitId: 'u-1', workingUnitName: 'Công ty A' },
    { workingUnitId: 'u-2', workingUnitName: ' Công ty B ' },
  ],
  members: [
    { memberId: 'm-1', fullName: 'Khách 1' },
    { memberId: 'm-2', fullName: 'Khách 2' },
  ],
};

describe('qrCodeOf', () => {
  it('takes the code itself, or the segment after /qr/ of a link', () => {
    expect(qrCodeOf(`  ${CODE}\n`)).toBe(CODE);
    expect(qrCodeOf(`https://uatapi01.thaco.com.vn/api/GuestSchedules/mobile/qr/${CODE}`)).toBe(CODE);
    expect(qrCodeOf(`https://uatapi01.thaco.com.vn/api/GuestSchedules/mobile/qr/${CODE}/check-in?x=1`)).toBe(CODE);
    expect(qrCodeOf('   ')).toBe('');
  });
});

describe('toVisit', () => {
  it('maps the schedule, the receiving units as the place', () => {
    expect(toVisit(dto, CODE)).toEqual({
      id: '35a1f640-d91e-4e4b-a62b-0ff16ce246d6',
      qrCode: CODE,
      code: 'AUTO1020260003',
      groupName: 'Đoàn khách mẫu',
      purpose: 'Đàm phán hợp đồng',
      guestCount: 2,
      fromDate: '2026-10-20T00:00:00Z',
      toDate: '2026-10-23T00:00:00Z',
      location: 'Công ty A, Công ty B',
    });
  });

  it('fills gaps: name from the code, head count from the members, one-day period', () => {
    const visit = toVisit({ ...dto, guestName: ' ', guestCount: null, endDate: null, workingUnits: [], purpose: '' }, CODE);
    expect(visit).toMatchObject({ groupName: 'AUTO1020260003', guestCount: 2, toDate: '2026-10-20T00:00:00Z', location: null, purpose: null });
  });

  it('finds no visit in an empty answer', () => {
    expect(toVisit(null, CODE)).toBeNull();
    expect(toVisit({ guestScheduleId: '' }, CODE)).toBeNull();
  });
});

describe('visitPhase', () => {
  it('counts the days of the period in Vietnam time', () => {
    const visit = toVisit(dto, CODE)!;
    expect(visitPhase(visit, new Date('2026-10-16T07:00:00Z'))).toEqual({ kind: 'upcoming', day: -3, days: 4 });
    expect(visitPhase(visit, new Date('2026-10-21T03:00:00Z'))).toEqual({ kind: 'ongoing', day: 2, days: 4 });
    expect(visitPhase(visit, new Date('2026-10-24T03:00:00Z'))).toEqual({ kind: 'ended', day: 5, days: 4 });
  });
});
