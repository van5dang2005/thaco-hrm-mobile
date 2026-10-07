import { isOngoing, isUpcoming, meetingDots, meetingProgress, meetingTone, weekKeys, weekStartOf } from '../myMeetings';
import { BookingStatus, type BookingDto } from '../types';

// Vietnam is UTC+7: 09:00 local = 02:00Z.
const at = (day: string, hh: number, mm = 0) => new Date(`${day}T${String(hh - 7).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`);
const booking = (status: BookingStatus, from: Date, to: Date): BookingDto => ({ id: String(Math.random()), status, from: from.toISOString(), to: to.toISOString() });

describe('isOngoing', () => {
  const b = booking(BookingStatus.Approved, at('2026-10-05', 9), at('2026-10-05', 10));
  it('is true only between from and to', () => {
    expect(isOngoing(b, at('2026-10-05', 8, 59))).toBe(false);
    expect(isOngoing(b, at('2026-10-05', 9))).toBe(true);
    expect(isOngoing(b, at('2026-10-05', 9, 59))).toBe(true);
    expect(isOngoing(b, at('2026-10-05', 10))).toBe(false);
  });
  it('needs an approved booking', () => {
    for (const status of [BookingStatus.Waiting, BookingStatus.Rejected, BookingStatus.Canceled, BookingStatus.Finished]) {
      expect(isOngoing(booking(status, at('2026-10-05', 9), at('2026-10-05', 10)), at('2026-10-05', 9, 30))).toBe(false);
    }
  });
  it('maps to the live tone and reports progress', () => {
    const now = at('2026-10-05', 9, 15);
    expect(meetingTone(b, now)).toBe('live');
    expect(meetingProgress(b, now)).toEqual({ ratio: 0.25, minutesLeft: 45 });
    expect(meetingTone(b, at('2026-10-05', 8))).toBe('approved');
  });
});

describe('meetingDots', () => {
  const day = '2026-10-05';
  const one = (status = BookingStatus.Approved) => booking(status, at(day, 9), at(day, 10));
  it('counts one dot per meeting of the day, capped at three', () => {
    expect(meetingDots([], day)).toBe(0);
    expect(meetingDots([one()], day)).toBe(1);
    expect(meetingDots([one(), one(BookingStatus.Waiting)], day)).toBe(2);
    expect(meetingDots([one(), one(), one(), one(), one()], day)).toBe(3);
  });
  it('ignores other days and rejected / cancelled bookings', () => {
    expect(meetingDots([booking(BookingStatus.Approved, at('2026-10-06', 9), at('2026-10-06', 10))], day)).toBe(0);
    expect(meetingDots([one(BookingStatus.Rejected), one(BookingStatus.Canceled)], day)).toBe(0);
  });
  it('uses the Vietnam day: 00:30 local belongs to that day', () => {
    expect(meetingDots([booking(BookingStatus.Approved, new Date('2026-10-04T17:30:00Z'), new Date('2026-10-04T18:00:00Z'))], day)).toBe(1);
  });
});

describe('weeks', () => {
  it('starts on Monday', () => {
    expect(weekStartOf('2026-10-05')).toBe('2026-10-05'); // Monday
    expect(weekStartOf('2026-10-11')).toBe('2026-10-05'); // Sunday
    expect(weekKeys('2026-10-05')[6]).toBe('2026-10-11');
  });
});

describe('isUpcoming', () => {
  it('is false once the meeting has ended or is closed', () => {
    const now = at('2026-10-05', 11);
    expect(isUpcoming(booking(BookingStatus.Approved, at('2026-10-05', 9), at('2026-10-05', 10)), now)).toBe(false);
    expect(isUpcoming(booking(BookingStatus.Approved, at('2026-10-05', 12), at('2026-10-05', 13)), now)).toBe(true);
    expect(isUpcoming(booking(BookingStatus.Canceled, at('2026-10-05', 12), at('2026-10-05', 13)), now)).toBe(false);
  });
});
