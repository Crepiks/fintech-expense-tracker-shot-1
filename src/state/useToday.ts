import { useEffect, useState } from 'react';
import { todayLocal } from '../domain/calc';

/** Refresh date-sensitive guidance at local midnight and after tab suspension. */
export function useToday() {
  const [today, setToday] = useState(todayLocal);
  useEffect(() => {
    let timer: number;
    const schedule = () => {
      window.clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timer = window.setTimeout(refresh, midnight.getTime() - now.getTime());
    };
    const refresh = () => { setToday(todayLocal()); schedule(); };
    schedule();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return today;
}
