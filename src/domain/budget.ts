import { monthKey } from './calc';

/** Divide remaining minor units across calendar days, including today. */
export function computeBudget(budgetMinor: number | null, spentMinor: number, month: string, today: string) {
  if (budgetMinor === null) return null;
  const remainingMinor = budgetMinor - spentMinor;
  let daysLeft: number | null = null;
  let safePerDayMinor: number | null = null;
  if (month === monthKey(today)) {
    const [year, number, day] = today.split('-').map(Number);
    const endOfMonth = new Date(0);
    endOfMonth.setFullYear(year, number, 0);
    daysLeft = endOfMonth.getDate() - day + 1;
    safePerDayMinor = Math.max(0, Math.floor(remainingMinor / daysLeft));
  }
  return {
    remainingMinor, overBudget: remainingMinor < 0,
    progress: Math.min(100, spentMinor / budgetMinor * 100),
    daysLeft, safePerDayMinor,
  };
}
