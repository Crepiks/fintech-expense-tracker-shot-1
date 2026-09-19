import { CATEGORIES, type Category } from './categories';
import type { Expense } from './types';

export function monthKey(date: string): string {
  return date.slice(0, 7);
}
export function todayLocal(): string {
  const now = new Date();
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function expensesForMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter(expense => monthKey(expense.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}
export function computeTotals(expenses: Expense[]) {
  const byCategory = Object.fromEntries(CATEGORIES.map(category => [category, 0])) as Record<Category, number>;
  let totalMinor = 0;
  for (const expense of expenses) {
    totalMinor += expense.amountMinor;
    byCategory[expense.category] += expense.amountMinor;
  }
  const categorySum = Object.values(byCategory).reduce((sum, amount) => sum + amount, 0);
  return { totalMinor, byCategory, invariantOk: categorySum === totalMinor };
}
export type TotalsData = ReturnType<typeof computeTotals>;
