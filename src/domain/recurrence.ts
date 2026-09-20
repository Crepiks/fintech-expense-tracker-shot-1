import { MAX_EXPENSES } from '../config';
import type { RecurringCost, StoredData } from './types';
import { isValidDate } from './validation';

function monthIndex(value: string): number {
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
}

/** Apply only due occurrences; the saved cursor also respects later deletions. */
export function applyRecurring(state: StoredData, today: string): StoredData {
  if (!isValidDate(today) || !state.settings.recurring?.length) return state;
  const expenses = [...state.expenses];
  const ids = new Set(expenses.map(expense => expense.id));
  const through = monthIndex(today);
  let changed = false;
  const recurring = state.settings.recurring.map(rule => {
    const first = monthIndex(rule.startDate);
    const afterLast = rule.lastAppliedMonth === null ? first : monthIndex(rule.lastAppliedMonth) + 1;
    let lastAppliedMonth = rule.lastAppliedMonth;
    for (let index = Math.max(first, afterLast); index <= through; index++) {
      const year = Math.floor(index / 12);
      const month = index % 12;
      const end = new Date(0);
      end.setUTCFullYear(year, month + 1, 0);
      const day = Math.min(rule.day, end.getUTCDate());
      const period = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}`;
      const date = `${period}-${String(day).padStart(2, '0')}`;
      if (date > today) break;
      if (date < rule.startDate) continue;
      const id = `recurring:${rule.id}:${period}`;
      if (!ids.has(id)) {
        // Do not advance past a blocked occurrence: it can resume after space is freed.
        if (expenses.length >= MAX_EXPENSES) break;
        expenses.push(occurrence(rule, id, date, year, month, day));
        ids.add(id);
      }
      lastAppliedMonth = period;
    }
    if (lastAppliedMonth === rule.lastAppliedMonth) return rule;
    changed = true;
    return { ...rule, lastAppliedMonth };
  });
  return changed ? { ...state, expenses, settings: { ...state.settings, recurring } } : state;
}

function occurrence(rule: RecurringCost, id: string, date: string, year: number, month: number, day: number) {
  const timestamp = new Date(0);
  timestamp.setUTCFullYear(year, month, day);
  return {
    id, date, amountMinor: rule.amountMinor, category: rule.category,
    description: rule.description, createdAt: Math.max(0, timestamp.getTime()),
    fixed: true, recurringId: rule.id,
  };
}
