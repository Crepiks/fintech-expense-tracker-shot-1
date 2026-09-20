import { isCategory } from './categories';
import { parseAmount } from './money';
import type { ExpenseDraft, ExpenseValue } from './types';

export type ExpenseErrors = Partial<Record<'amount' | 'category' | 'date', string>>;
type ValidationResult =
  { ok: true; value: ExpenseValue; futureDate: boolean } | { ok: false; errors: ExpenseErrors };

/** Compare calendar parts explicitly, avoiding UTC parsing and Date rollover. */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  return (
    year > 0 &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function validateExpense(draft: ExpenseDraft, today: string): ValidationResult {
  const amount = parseAmount(draft.amount);
  const errors: ExpenseErrors = {};
  if (!amount.ok) errors.amount = amount.error;
  if (!isCategory(draft.category)) errors.category = 'Choose a category.';
  if (!isValidDate(draft.date)) errors.date = 'Pick a date.';
  if (!amount.ok || !isCategory(draft.category) || errors.date) return { ok: false, errors };
  return {
    ok: true,
    value: {
      amountMinor: amount.minor,
      category: draft.category,
      date: draft.date,
      description: (draft.description ?? '').trim().slice(0, 200),
    },
    futureDate: draft.date > today,
  };
}
