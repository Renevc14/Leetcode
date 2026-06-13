import { useEffect, useState } from 'react';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  /** "2d 04:13:09" or "04:13:09" when under a day */
  formatted: string;
}

/**
 * Live countdown to a target ISO timestamp, ticking every second.
 */
export function useCountdown(target: string | null | undefined): CountdownParts {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = target ? new Date(target).getTime() - now : 0;
  const clamped = Math.max(diff, 0);

  const days = Math.floor(clamped / 86_400_000);
  const hours = Math.floor((clamped % 86_400_000) / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: diff <= 0,
    formatted: days > 0 ? `${days}d ${clock}` : clock,
  };
}
