import { expect, it } from 'vitest';
import { computeBudget } from '../../src/domain/budget';

it('has no budget metrics when the limit is cleared', () => expect(computeBudget(null, 300000, '2026-09', '2026-09-19')).toBeNull());
it('floors safe daily spending in minor units and includes today', () => {
  expect(computeBudget(500000, 300000, '2026-09', '2026-09-19')).toEqual({ remainingMinor: 200000, overBudget: false, progress: 60, pctUsed: 60, daysLeft: 12, safePerDayMinor: 16666 });
});
it('shows over-budget amounts and clamps the progress and safe allowance', () => {
  expect(computeBudget(50000, 60000, '2026-09', '2026-09-30')).toEqual({ remainingMinor: -10000, overBudget: true, progress: 100, pctUsed: 120, daysLeft: 1, safePerDayMinor: 0 });
});
it('handles exactly reaching the budget', () => {
  expect(computeBudget(50000, 50000, '2026-09', '2026-09-30')).toMatchObject({ remainingMinor: 0, overBudget: false, safePerDayMinor: 0 });
});
it('counts leap-year February correctly', () => {
  expect(computeBudget(10000, 0, '2024-02', '2024-02-28')).toMatchObject({ daysLeft: 2, safePerDayMinor: 5000, progress: 0 });
});
it.each(['2026-08', '2026-10'])('omits a daily allowance for non-current month %s', month => {
  expect(computeBudget(500000, 300000, month, '2026-09-19')).toEqual({ remainingMinor: 200000, overBudget: false, progress: 60, pctUsed: 60, daysLeft: null, safePerDayMinor: null });
});
it('counts every day in a 30-day month from its first day', () => {
  expect(computeBudget(30000, 0, '2026-04', '2026-04-01')).toMatchObject({ daysLeft: 30, safePerDayMinor: 1000 });
});
it('keeps the actual percentage even when the visual bar is capped', () => {
  expect(computeBudget(20000, 30000, '2026-04', '2026-04-30')).toMatchObject({ pctUsed: 150 });
});
