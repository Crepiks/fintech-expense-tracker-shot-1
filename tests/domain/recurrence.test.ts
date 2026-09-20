import { expect, it } from 'vitest';
import { applyRecurring } from '../../src/domain/recurrence';
import type { RecurringCost, StoredData } from '../../src/domain/types';
import { empty, expense } from '../fixtures';

const rule: RecurringCost = {
  id: 'rent',
  description: 'Rent',
  category: 'Housing',
  amountMinor: 80000,
  day: 31,
  startDate: '2026-01-01',
  lastAppliedMonth: null,
};
const state = (rules: RecurringCost[] = [rule]): StoredData => ({
  ...empty,
  settings: { ...empty.settings, recurring: rules },
});

it('leaves legacy data and empty rules unchanged', () => {
  expect(applyRecurring(empty, '2026-09-20')).toBe(empty);
  const noRules = state([]);
  expect(applyRecurring(noRules, '2026-09-20')).toBe(noRules);
});

it('ignores invalid dates without modifying recurrence progress', () => {
  const initial = state();
  expect(applyRecurring(initial, 'invalid')).toBe(initial);
});

it('materializes due months with stable ids and clamps short months', () => {
  const initial = state();
  const result = applyRecurring(initial, '2026-04-20');
  expect(result.expenses).toEqual([
    {
      id: 'recurring:rent:2026-01',
      description: 'Rent',
      amountMinor: 80000,
      category: 'Housing',
      date: '2026-01-31',
      createdAt: 1769817600000,
      fixed: true,
      recurringId: 'rent',
    },
    {
      id: 'recurring:rent:2026-02',
      description: 'Rent',
      amountMinor: 80000,
      category: 'Housing',
      date: '2026-02-28',
      createdAt: 1772236800000,
      fixed: true,
      recurringId: 'rent',
    },
    {
      id: 'recurring:rent:2026-03',
      description: 'Rent',
      amountMinor: 80000,
      category: 'Housing',
      date: '2026-03-31',
      createdAt: 1774915200000,
      fixed: true,
      recurringId: 'rent',
    },
  ]);
  expect(result.settings.recurring?.[0].lastAppliedMonth).toBe('2026-03');
  expect(initial.expenses).toEqual([]);
  expect(initial.settings.recurring?.[0].lastAppliedMonth).toBeNull();
  expect(applyRecurring(result, '2026-04-20')).toBe(result);
});

it('includes the due date and leap day across year boundaries', () => {
  const initial = state([{ ...rule, startDate: '2023-12-01' }]);
  expect(applyRecurring(initial, '2024-02-29').expenses.map((item) => item.date)).toEqual([
    '2023-12-31',
    '2024-01-31',
    '2024-02-29',
  ]);
});

it('skips an occurrence before the starting day and waits for future starts', () => {
  const initial = state([
    { ...rule, day: 1, startDate: '2026-01-20' },
    { ...rule, id: 'future', startDate: '2027-01-01' },
  ]);
  const result = applyRecurring(initial, '2026-02-01');
  expect(result.expenses.map((item) => item.date)).toEqual(['2026-02-01']);
  expect(result.settings.recurring?.[0].lastAppliedMonth).toBe('2026-02');
  expect(result.settings.recurring?.[1].lastAppliedMonth).toBeNull();
});

it('does not regenerate deleted prior occurrences', () => {
  const initial = state([{ ...rule, lastAppliedMonth: '2026-02' }]);
  expect(applyRecurring(initial, '2026-03-31').expenses.map((item) => item.date)).toEqual([
    '2026-03-31',
  ]);
});

it('recognizes existing occurrence ids while advancing progress', () => {
  const existing = { ...expense, id: 'recurring:rent:2026-01' };
  const result = applyRecurring({ ...state(), expenses: [existing] }, '2026-02-28');
  expect(result.expenses).toHaveLength(2);
  expect(result.expenses[0]).toEqual(existing);
  expect(result.expenses[1].date).toBe('2026-02-28');
  expect(result.settings.recurring?.[0].lastAppliedMonth).toBe('2026-02');
});

it('stops at capacity without dropping records or advancing unapplied months', () => {
  const initial = {
    ...state(),
    expenses: Array.from({ length: 9999 }, (_, i) => ({ ...expense, id: String(i) })),
  };
  const result = applyRecurring(initial, '2026-03-31');
  expect(result.expenses).toHaveLength(10000);
  expect(result.expenses.at(-1)?.date).toBe('2026-01-31');
  expect(result.settings.recurring?.[0].lastAppliedMonth).toBe('2026-01');
  expect(applyRecurring(result, '2026-03-31')).toBe(result);
  const resumed = applyRecurring({ ...result, expenses: result.expenses.slice(1) }, '2026-03-31');
  expect(resumed.expenses).toHaveLength(10000);
  expect(resumed.expenses.at(-1)?.date).toBe('2026-02-28');
  expect(resumed.settings.recurring?.[0].lastAppliedMonth).toBe('2026-02');
});

it('bounds ancient recurrence catch-up and uses valid nonnegative timestamps', () => {
  const result = applyRecurring(state([{ ...rule, startDate: '0001-01-01' }]), '9999-12-31');
  expect(result.expenses).toHaveLength(10000);
  expect(result.expenses[0]).toMatchObject({ date: '0001-01-31', createdAt: 0 });
  expect(result.expenses.at(-1)?.date).toBe('0834-04-30');
  expect(result.settings.recurring?.[0].lastAppliedMonth).toBe('0834-04');
});
