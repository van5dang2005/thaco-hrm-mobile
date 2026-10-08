import { act, create } from 'react-test-renderer';

import { greetingPeriod, msToNextPeriod, useGreeting } from '../useGreeting';

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/core/theme/ThemeProvider', () => ({ useTheme: () => ({ scheme: mockScheme }) }));
jest.mock('@/shared/ui/icons', () => ({ SunIcon: 'Sun', SunriseIcon: 'Sunset', MoonIcon: 'Moon' }));

// Device-local times (the greeting follows the phone's clock, not Vietnam time).
const local = (hour: number, minute = 0) => new Date(2026, 9, 5, hour, minute, 0);

function renderGreeting() {
  let latest!: ReturnType<typeof useGreeting>;
  function Probe() {
    latest = useGreeting();
    return null;
  }
  act(() => {
    create(<Probe />);
  });
  return () => latest;
}

describe('greetingPeriod', () => {
  it.each([
    [0, 0, 'morning'],
    [11, 59, 'morning'],
    [12, 0, 'afternoon'],
    [17, 59, 'afternoon'],
    [18, 0, 'evening'],
    [23, 59, 'evening'],
  ] as const)('%i:%i is %s', (hour, minute, expected) => {
    expect(greetingPeriod(local(hour, minute))).toBe(expected);
  });
});

describe('useGreeting', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockScheme = 'light';
  });
  afterEach(() => jest.useRealTimers());

  it.each([
    [11, 59, 'morning', 'Sun', '#FBF0DC', '#B26B00'],
    [12, 0, 'afternoon', 'Sunset', '#FDE9DF', '#C25B1F'],
    [17, 59, 'afternoon', 'Sunset', '#FDE9DF', '#C25B1F'],
    [18, 0, 'evening', 'Moon', '#E7E9F7', '#3B4A9A'],
  ] as const)('at %i:%i returns %s', (hour, minute, key, icon, bg, fg) => {
    jest.setSystemTime(local(hour, minute));
    const greeting = renderGreeting()();
    expect(greeting).toMatchObject({ key, icon, bg, fg });
  });

  it('uses the dark tints in dark mode', () => {
    mockScheme = 'dark';
    jest.setSystemTime(local(9));
    expect(renderGreeting()()).toMatchObject({ key: 'morning', bg: '#3A2A10', fg: '#E9A440' });
  });

  it('moves to the next period when the clock crosses 12:00', () => {
    jest.setSystemTime(local(11, 59));
    const get = renderGreeting();
    expect(get().key).toBe('morning');
    act(() => {
      jest.advanceTimersByTime(msToNextPeriod(local(11, 59)) + 1000);
    });
    expect(get().key).toBe('afternoon');
  });
});

describe('msToNextPeriod', () => {
  it('counts down to 12:00, 18:00 and midnight', () => {
    expect(msToNextPeriod(local(11, 59))).toBe(60_000);
    expect(msToNextPeriod(local(17, 30))).toBe(30 * 60_000);
    expect(msToNextPeriod(local(23, 0))).toBe(60 * 60_000);
  });
});
