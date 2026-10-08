import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { type AppIcon, MoonIcon, SunriseIcon, SunIcon } from '@/shared/ui/icons';

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/** Device hour: 0–11 morning, 12–17 afternoon, 18–23 evening. */
export function greetingPeriod(date: Date): GreetingPeriod {
  const hour = date.getHours();
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

/** Milliseconds until the next 12:00 / 18:00 / 00:00 on the device clock. */
export function msToNextPeriod(date: Date): number {
  const next = new Date(date);
  const hour = date.getHours();
  next.setHours(hour < 12 ? 12 : hour < 18 ? 18 : 24, 0, 0, 0);
  return next.getTime() - date.getTime();
}

const icons: Record<GreetingPeriod, AppIcon> = { morning: SunIcon, afternoon: SunriseIcon, evening: MoonIcon };

const tints = {
  light: {
    morning: { bg: '#FBF0DC', fg: '#B26B00' },
    afternoon: { bg: '#FDE9DF', fg: '#C25B1F' },
    evening: { bg: '#E7E9F7', fg: '#3B4A9A' },
  },
  dark: {
    morning: { bg: '#3A2A10', fg: '#E9A440' },
    afternoon: { bg: '#3A2216', fg: '#F08A52' },
    evening: { bg: '#1E2240', fg: '#9AA6F0' },
  },
} as const;

/** Greeting key (`home.greeting.<key>`), icon and tint for the current time of day; follows the clock and app resume. */
export function useGreeting() {
  const { scheme } = useTheme();
  const [period, setPeriod] = useState(() => greetingPeriod(new Date()));

  useEffect(() => {
    const sync = () => setPeriod(greetingPeriod(new Date()));
    const timer = setTimeout(sync, msToNextPeriod(new Date()) + 500);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && sync());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [period]);

  return { key: period, icon: icons[period], ...tints[scheme === 'dark' ? 'dark' : 'light'][period] };
}
