import { monthKey } from './calc';

/** Reserve pending fixed costs, then divide available minor units including today. */
export function computeBudget(budgetMinor: number | null, spentMinor: number, month: string, today: string, reservedMinor = 0) {
  if (budgetMinor === null) return null;
  const remainingMinor = budgetMinor - spentMinor;
  let daysLeft: number | null = null;
  let safePerDayMinor: number | null = null;
  if (month === monthKey(today)) {
    const [year, number, day] = today.split('-').map(Number);
    const endOfMonth = new Date(0);
    endOfMonth.setFullYear(year, number, 0);
    daysLeft = endOfMonth.getDate() - day + 1;
    safePerDayMinor = Math.max(0, Math.floor((remainingMinor - reservedMinor) / daysLeft));
  }
  return {
    remainingMinor, overBudget: remainingMinor < 0,
    progress: Math.min(100, spentMinor / budgetMinor * 100),
    pctUsed: spentMinor / budgetMinor * 100,
    daysLeft, safePerDayMinor,
  };
}

/** UTC parts avoid DST and the Date constructor's special handling of years 0–99. */
function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

/** Clamp stipend days to each month's final day, rolling into the next year. */
export function nextStipend(today: string, stipendDay: number): { date: string; daysUntil: number } {
  const [year, month, day] = today.split('-').map(Number);
  let target = utcDate(year, month, Math.min(stipendDay, utcDate(year, month + 1, 0).getUTCDate()));
  if (target.getUTCDate() < day) {
    target = utcDate(year, month + 1, Math.min(stipendDay, utcDate(year, month + 2, 0).getUTCDate()));
  }
  return {
    date: `${String(target.getUTCFullYear()).padStart(4, '0')}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(target.getUTCDate()).padStart(2, '0')}`,
    daysUntil: (target.getTime() - utcDate(year, month, day).getTime()) / 86400000,
  };
}
