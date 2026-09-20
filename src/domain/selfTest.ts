import { computeTotals, expensesForMonth } from './calc';
import { formatAmount } from './money';
import type { Expense, StoredData } from './types';
import { expensesReducer } from '../state/reducer';
import { emptyData } from '../storage/schema';

export type ScenarioResult = { step: string; label: string; expected: string; actual: string; pass: boolean };

/** Compare integer minor units before formatting display values. */
function checksFor(state: StoredData, step: string, count: number, total: number, food: number): ScenarioResult[] {
  const list = expensesForMonth(state.expenses, '2000-01');
  const totals = computeTotals(list);
  const check = <T extends number | boolean>(label: string, expected: T, actual: T, display: (value: T) => string): ScenarioResult =>
    ({ step, label, expected: display(expected), actual: display(actual), pass: expected === actual });
  return [
    check('Record count', count, list.length, String),
    check('Overall total', total, totals.totalMinor, formatAmount),
    check('Food', food, totals.byCategory.Food, formatAmount),
    check('Transportation', 60000, totals.byCategory.Transportation, formatAmount),
    check('Categories equal total', true, totals.invariantOk, String),
  ];
}

/** Exercise the same reducer and month selection as the UI, entirely in memory. */
export function runSelfTest(): ScenarioResult[] {
  let state = emptyData();
  const records: Expense[] = [
    { id: 'judge-1', amountMinor: 150000, category: 'Food', date: '2000-01-10', createdAt: 1 },
    { id: 'judge-2', amountMinor: 60000, category: 'Transportation', date: '2000-01-11', createdAt: 2 },
    { id: 'judge-3', amountMinor: 90000, category: 'Food', date: '2000-01-12', createdAt: 3 },
  ];
  for (const expense of records) state = expensesReducer(state, { type: 'add', expense });
  const added = checksFor(state, 'After 3 expenses', 3, 300000, 240000);
  state = expensesReducer(state, { type: 'remove', id: 'judge-3' });
  return [...added, ...checksFor(state, 'After deleting Food 900', 2, 210000, 150000)];
}
