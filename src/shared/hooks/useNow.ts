import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs` (countdowns, "đang diễn ra" badges). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
