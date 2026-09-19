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
