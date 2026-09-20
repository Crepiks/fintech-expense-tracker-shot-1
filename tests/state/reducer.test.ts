import { expect, it } from 'vitest';
import { expensesReducer } from '../../src/state/reducer';
import { data, empty, expense } from '../fixtures';

it('adds an expense without mutating previous state', () => {
  const result = expensesReducer(empty, { type: 'add', expense });
  expect(result.expenses).toEqual([expense]);
  expect(empty.expenses).toEqual([]);
});
it('removes only the matching id', () => {
  expect(expensesReducer(data, { type: 'remove', id: 'one' })).toEqual({ ...data, expenses: [] });
  expect(expensesReducer(data, { type: 'remove', id: 'absent' })).toEqual(data);
});
it('restores the same record and id', () => {
  expect(expensesReducer(empty, { type: 'restore', expense }).expenses).toEqual([expense]);
});
it.each(['add', 'restore'] as const)('does not duplicate an id on %s', type => {
  expect(expensesReducer(data, { type, expense })).toBe(data);
});
it('replaces state with validated data', () => {
  expect(expensesReducer(empty, { type: 'replaceAll', data })).toBe(data);
});
it('sets and clears the monthly budget', () => {
  expect(expensesReducer(empty, { type: 'setBudget', minor: 250000 }).settings.monthlyBudgetMinor).toBe(250000);
  expect(expensesReducer(data, { type: 'setBudget', minor: null }).settings.monthlyBudgetMinor).toBeNull();
});
it('enforces the record cap for add and restore', () => {
  const full = { ...data, expenses: Array.from({ length: 10000 }, (_, i) => ({ ...expense, id: String(i) })) };
  expect(expensesReducer(full, { type: 'add', expense })).toBe(full);
  expect(expensesReducer(full, { type: 'restore', expense })).toBe(full);
});
it('sets and clears stipend day while keeping the budget, and vice versa', () => {
  const withStipend = expensesReducer(data, { type: 'setStipendDay', day: 31 });
  expect(withStipend.settings).toEqual({ monthlyBudgetMinor: 500000, stipendDay: 31 });
  expect(expensesReducer(withStipend, { type: 'setBudget', minor: null }).settings).toEqual({ monthlyBudgetMinor: null, stipendDay: 31 });
  expect(expensesReducer(withStipend, { type: 'setStipendDay', day: null }).settings).toEqual({ monthlyBudgetMinor: 500000, stipendDay: null });
});

it('updates only an existing expense while preserving other records', () => {
  const state = { ...data, expenses: [expense, { ...expense, id: 'two' }] };
  const updated = { ...expense, amountMinor: 250, fixed: true };
  expect(expensesReducer(state, { type: 'update', expense: updated }).expenses).toEqual([updated, state.expenses[1]]);
  expect(state.expenses[0].amountMinor).toBe(150000);
  expect(expensesReducer(empty, { type: 'update', expense: updated })).toBe(empty);
});

it('sets and clears individual category limits while preserving other settings', () => {
  const food = expensesReducer(data, { type: 'setCategoryLimit', category: 'Food', minor: 20000 });
  const fun = expensesReducer(food, { type: 'setCategoryLimit', category: 'Fun', minor: 5000 });
  expect(fun.settings).toEqual({ ...data.settings, categoryLimits: { Food: 20000, Fun: 5000 } });
  expect(expensesReducer(fun, { type: 'setCategoryLimit', category: 'Food', minor: null }).settings.categoryLimits).toEqual({ Fun: 5000 });
  expect(expensesReducer(empty, { type: 'setCategoryLimit', category: 'Food', minor: null }).settings.categoryLimits).toEqual({});
});

it('imports a complete batch without modifying existing expenses', () => {
  const imported = [{ ...expense, id: 'two' }, { ...expense, id: 'three' }];
  expect(expensesReducer(data, { type: 'importExpenses', expenses: imported }).expenses).toEqual([expense, ...imported]);
  expect(expensesReducer(data, { type: 'importExpenses', expenses: [] })).toBe(data);
});

it('rejects duplicate ids and over-capacity imports without a partial write', () => {
  const other = { ...expense, id: 'two' };
  expect(expensesReducer(data, { type: 'importExpenses', expenses: [other, expense] })).toBe(data);
  expect(expensesReducer(empty, { type: 'importExpenses', expenses: [other, other] })).toBe(empty);
  const batch = Array.from({ length: 10000 }, (_, i) => ({ ...expense, id: String(i) }));
  expect(expensesReducer(data, { type: 'importExpenses', expenses: batch })).toBe(data);
  expect(expensesReducer(empty, { type: 'importExpenses', expenses: batch }).expenses).toHaveLength(10000);
});

const recurring = { id: 'rent', description: 'Rent', category: 'Housing' as const, amountMinor: 50000, day: 1, startDate: '2026-09-01', lastAppliedMonth: null };

it('adds unique recurring rules and removes rules without removing past expenses', () => {
  const one = expensesReducer(data, { type: 'addRecurring', cost: recurring });
  const two = expensesReducer(one, { type: 'addRecurring', cost: { ...recurring, id: 'gym' } });
  expect(two.settings.recurring).toEqual([recurring, { ...recurring, id: 'gym' }]);
  expect(expensesReducer(one, { type: 'addRecurring', cost: recurring })).toBe(one);
  expect(expensesReducer(two, { type: 'removeRecurring', id: 'rent' })).toEqual({ ...data, settings: { ...data.settings, recurring: [{ ...recurring, id: 'gym' }] } });
  expect(expensesReducer(empty, { type: 'removeRecurring', id: 'missing' }).settings.recurring).toEqual([]);
});

it('does not add rules above the supported rule limit', () => {
  const state = { ...empty, settings: { ...empty.settings, recurring: Array.from({ length: 10000 }, (_, i) => ({ ...recurring, id: String(i) })) } };
  expect(expensesReducer(state, { type: 'addRecurring', cost: recurring })).toBe(state);
});

it('materializes due recurring costs through the reducer', () => {
  const state = { ...empty, settings: { ...empty.settings, recurring: [recurring] } };
  const result = expensesReducer(state, { type: 'applyRecurring', today: '2026-09-20' });
  expect(result.expenses).toMatchObject([{ id: 'recurring:rent:2026-09', amountMinor: 50000, fixed: true, recurringId: 'rent' }]);
  expect(result.settings.recurring?.[0].lastAppliedMonth).toBe('2026-09');
});
