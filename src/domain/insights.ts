import type { Expense, RecurringCost } from './types';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** UTC components represent calendar dates only, independent of timezone and DST. */
function calendarDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

function monthParts(month: string): number[] {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new RangeError('Use a month in YYYY-MM format.');
  const [year, number] = month.split('-').map(Number);
  if (year < 1 || number < 1 || number > 12) throw new RangeError('Month is outside the supported calendar.');
  return [year, number];
}

export function daysInMonth(month: string): number {
  const [year, number] = monthParts(month);
  return calendarDate(year, number + 1, 0).getUTCDate();
}

function dateParts(date: string): number[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError('Use a date in YYYY-MM-DD format.');
  const month = date.slice(0, 7);
  const [year, number] = monthParts(month);
  const day = Number(date.slice(8));
  if (day < 1 || day > daysInMonth(month)) throw new RangeError('Date is outside its calendar month.');
  return [year, number, day];
}

export function dateLabel(date: string): string {
  const [year, month, day] = dateParts(date);
  return `${WEEKDAYS[calendarDate(year, month, day).getUTCDay()]} · ${MONTHS[month - 1]} ${day}`;
}

/** Pad Monday-first weeks; padding beyond year 9999 is an inert blank cell. */
export function calendarCells(month: string): Array<{ date: string; day: number; inMonth: boolean }> {
  const [year, number] = monthParts(month);
  const days = daysInMonth(month);
  const leading = (calendarDate(year, number, 1).getUTCDay() + 6) % 7;
  const count = Math.ceil((leading + days) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const day = index - leading + 1;
    const date = calendarDate(year, number, day);
    if (date.getUTCFullYear() > 9999) return { date: '', day: 0, inMonth: false };
    return { date: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: day >= 1 && day <= days };
  });
}

export function calendarShade(variableMinor: number): number {
  if (variableMinor === 0) return 0;
  if (variableMinor < 1500) return 1;
  if (variableMinor < 3000) return 2;
  if (variableMinor < 5000) return 3;
  return 4;
}

function pendingFixedCosts(expenses: Expense[], month: string, today: string, recurring: RecurringCost[]): number {
  const days = daysInMonth(month);
  return recurring.reduce((sum, rule) => {
    const due = `${month}-${String(Math.min(rule.day, days)).padStart(2, '0')}`;
    if (due <= today || due < rule.startDate || (rule.lastAppliedMonth !== null && rule.lastAppliedMonth >= month)
      || expenses.some(expense => expense.recurringId === rule.id)) return sum;
    return sum + rule.amountMinor;
  }, 0);
}

/**
 * Totals include every recorded date in the month. Observed averages use elapsed
 * days only. Forecast = observed spend + future fixed + max(known future variable,
 * unrounded observed variable average × future days), rounded to minor units once.
 * Safe spending reserves pending fixed costs and divides by days including today.
 */
export function monthInsights(expenses: Expense[], month: string, today: string, budgetMinor: number | null,
  recurring: RecurringCost[] = []) {
  const [, , todayDay] = dateParts(today);
  const days = daysInMonth(month);
  const currentMonth = today.slice(0, 7);
  const elapsedDays = month < currentMonth ? days : month === currentMonth ? todayDay : 0;
  const records = expenses.filter(expense => expense.date.slice(0, 7) === month);
  const actualPoints = Array<number>(elapsedDays + 1).fill(0);
  const spendDays = new Set<number>();
  let totalMinor = 0;
  let fixedMinor = 0;
  let observedVariableMinor = 0;
  let futureVariableMinor = 0;
  let futureFixedMinor = pendingFixedCosts(records, month, today, recurring);
  const pendingMinor = futureFixedMinor;
  for (const expense of records) {
    const day = Number(expense.date.slice(8));
    totalMinor += expense.amountMinor;
    if (expense.fixed) fixedMinor += expense.amountMinor;
    if (day <= elapsedDays) {
      actualPoints[day] += expense.amountMinor;
      spendDays.add(day);
      if (!expense.fixed) observedVariableMinor += expense.amountMinor;
    } else if (expense.fixed) futureFixedMinor += expense.amountMinor;
    else futureVariableMinor += expense.amountMinor;
  }
  for (let day = 1; day <= elapsedDays; day++) actualPoints[day] += actualPoints[day - 1];
  const observedAverage = elapsedDays === 0 ? 0 : observedVariableMinor / elapsedDays;
  const remainingMinor = budgetMinor === null ? null : budgetMinor - totalMinor;
  const monthFixedMinor = fixedMinor + pendingMinor;
  return {
    totalMinor, fixedMinor, monthFixedMinor, variableMinor: totalMinor - fixedMinor,
    variableAverageMinor: Math.round(observedAverage), elapsedDays, days, remainingMinor,
    safePerDayMinor: remainingMinor !== null && month === currentMonth
      ? Math.max(0, Math.floor((remainingMinor - pendingMinor) / (days - elapsedDays + 1))) : null,
    noSpendDays: elapsedDays - spendDays.size,
    forecastMinor: Math.round(actualPoints[elapsedDays] + futureFixedMinor
      + Math.max(futureVariableMinor, observedAverage * (days - elapsedDays))),
    paceMinor: budgetMinor === null ? null
      : Math.round(monthFixedMinor + Math.max(0, budgetMinor - monthFixedMinor) * elapsedDays / days),
    actualPoints, futureFixedMinor,
  };
}
