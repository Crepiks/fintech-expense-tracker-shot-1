import { computeTotals } from './calc';
import type { Expense } from './types';
import { expensesReducer } from '../state/reducer';
import { emptyData } from '../storage/schema';

export type ScenarioResult = { label: string; expected: number | boolean; actual: number | boolean; pass: boolean };

/** Exercise the same reducer as the UI entirely in memory, with fixed fixtures. */
export function runSelfTest(): ScenarioResult[] {
  let state = emptyData();
  const records: Expense[] = [
    { id: 'scenario-food-1500', amountMinor: 150000, category: 'Food', date: '2026-09-01', createdAt: 1 },
    { id: 'scenario-transport-600', amountMinor: 60000, category: 'Transportation', date: '2026-09-01', createdAt: 2 },
    { id: 'scenario-food-900', amountMinor: 90000, category: 'Food', date: '2026-09-01', createdAt: 3 },
  ];
  for (const expense of records) state = expensesReducer(state, { type: 'add', expense });
  const added = computeTotals(state.expenses);
  state = expensesReducer(state, { type: 'remove', id: 'scenario-food-900' });
  const removed = computeTotals(state.expenses);
  const checks: Omit<ScenarioResult, 'pass'>[] = [
    { label: 'After adding: total', expected: 300000, actual: added.totalMinor },
    { label: 'After adding: Food', expected: 240000, actual: added.byCategory.Food },
    { label: 'After adding: Transportation', expected: 60000, actual: added.byCategory.Transportation },
    { label: 'After adding: categories equal total', expected: true, actual: added.invariantOk },
    { label: 'After deleting: total', expected: 210000, actual: removed.totalMinor },
    { label: 'After deleting: Food', expected: 150000, actual: removed.byCategory.Food },
    { label: 'After deleting: Transportation', expected: 60000, actual: removed.byCategory.Transportation },
    { label: 'After deleting: categories equal total', expected: true, actual: removed.invariantOk },
  ];
  return checks.map(check => ({ ...check, pass: check.actual === check.expected }));
}
