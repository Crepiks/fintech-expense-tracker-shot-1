import { expect, it, vi } from 'vitest';
import { computeTotals, expensesForMonth, monthKey, todayLocal } from '../../src/domain/calc';
import type { Expense } from '../../src/domain/types';

const expenses: Expense[] = [
  { id: 'a', amountMinor: 150000, category: 'Food', date: '2026-09-01', createdAt: 1 },
  { id: 'b', amountMinor: 60000, category: 'Transportation', date: '2026-09-02', createdAt: 2 },
  { id: 'c', amountMinor: 90000, category: 'Food', date: '2026-09-02', createdAt: 3 },
];
it('derives the 3000 total and exact category sums', () => {
  expect(computeTotals(expenses)).toEqual({
    totalMinor: 300000,
    byCategory: { Food: 240000, Transportation: 60000, Housing: 0, Study: 0, Fun: 0, Health: 0, Other: 0 },
    invariantOk: true,
  });
});
it('derives 2100 after removing the 900 expense', () => {
  expect(computeTotals(expenses.slice(0, 2))).toMatchObject({ totalMinor: 210000, byCategory: { Food: 150000, Transportation: 60000 }, invariantOk: true });
});
it('keeps other months out and orders by date then creation time without mutating input', () => {
  const list = [...expenses, { ...expenses[0], id: 'd', date: '2026-10-01' }];
  const result = expensesForMonth(list, '2026-09');
  expect(result.map(item => item.id)).toEqual(['c', 'b', 'a']);
  expect(computeTotals(result).totalMinor).toBe(300000);
  expect(list.map(item => item.id)).toEqual(['a', 'b', 'c', 'd']);
});
it('returns zero totals for an empty month', () => {
  expect(expensesForMonth(expenses, '2026-08')).toEqual([]);
  expect(computeTotals([])).toMatchObject({ totalMinor: 0, invariantOk: true });
});
it('extracts a month from a date string', () => expect(monthKey('2026-09-30')).toBe('2026-09'));
it('builds today from local calendar fields', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 2, 23, 30));
  expect(todayLocal()).toBe('2026-01-02');
  vi.useRealTimers();
});
