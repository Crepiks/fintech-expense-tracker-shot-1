import { expect, it } from 'vitest';
import { parseStoredData } from '../../src/storage/schema';
import { data, empty, expense } from '../fixtures';

it('returns fresh empty data when the storage key is absent', () => {
  expect(parseStoredData(null)).toEqual({ data: empty, recovered: false });
});
it('accepts valid records with and without descriptions', () => {
  expect(parseStoredData(JSON.stringify(data))).toEqual({ data, recovered: false });
  const described = { ...data, expenses: [{ ...expense, description: 'Lunch' }] };
  expect(parseStoredData(JSON.stringify(described))).toEqual({ data: described, recovered: false });
});
it.each([
  '{broken',
  'null',
  '[]',
  '4',
  '{}',
  '{"version":2,"expenses":[]}',
  '{"version":1,"expenses":{}}',
])('recovers malformed or unsupported data %s', (raw) => {
  expect(parseStoredData(raw)).toEqual({ data: empty, recovered: true });
});
it.each([
  null,
  [],
  3,
  {},
  { ...expense, id: '' },
  { ...expense, id: ' ' },
  { ...expense, id: 2 },
  { ...expense, amountMinor: 0 },
  { ...expense, amountMinor: -1 },
  { ...expense, amountMinor: 1.5 },
  { ...expense, amountMinor: 100000000000 },
  { ...expense, category: 'Bad' },
  { ...expense, date: 2026 },
  { ...expense, date: '2026-02-30' },
  { ...expense, createdAt: -1 },
  { ...expense, createdAt: null },
  { ...expense, createdAt: 1.5 },
  { ...expense, description: 4 },
  { ...expense, description: null },
])('drops an invalid record but preserves valid records', (invalid) => {
  const result = parseStoredData(JSON.stringify({ ...data, expenses: [invalid, expense] }));
  expect(result).toEqual({ data, recovered: true });
});
it('drops duplicate ids', () => {
  expect(parseStoredData(JSON.stringify({ ...data, expenses: [expense, expense] }))).toEqual({
    data,
    recovered: true,
  });
});
it('limits excessive records without overflowing aggregate arithmetic', () => {
  const expenses = Array.from({ length: 10001 }, (_, i) => ({ ...expense, id: String(i) }));
  const result = parseStoredData(JSON.stringify({ ...data, expenses }));
  expect(result.data.expenses).toHaveLength(10000);
  expect(result.data.expenses.at(-1)?.id).toBe('9999');
  expect(result.recovered).toBe(true);
});
it.each([
  null,
  [],
  { monthlyBudgetMinor: -1 },
  { monthlyBudgetMinor: 0 },
  { monthlyBudgetMinor: 0.5 },
  { monthlyBudgetMinor: '50' },
  { monthlyBudgetMinor: 100000000000 },
])('clears malformed settings while retaining expenses', (settings) => {
  expect(parseStoredData(JSON.stringify({ ...data, settings }))).toEqual({
    data: { ...data, settings: { monthlyBudgetMinor: null, stipendDay: null } },
    recovered: true,
  });
});
it('accepts an explicitly cleared budget', () => {
  expect(parseStoredData(JSON.stringify(empty))).toEqual({ data: empty, recovered: false });
});
it('normalizes descriptions and discards unrecognized fields', () => {
  const result = parseStoredData(
    JSON.stringify({
      ...data,
      expenses: [{ ...expense, description: ' ' + 'x'.repeat(201), unknown: true }],
    }),
  );
  expect(result.data.expenses).toEqual([{ ...expense, description: 'x'.repeat(200) }]);
});
it.each([{}, { monthlyBudgetMinor: 500000 }, undefined])(
  'loads legacy missing settings fields without a corruption warning',
  (settings) => {
    const result = parseStoredData(JSON.stringify({ ...data, settings }));
    expect(result.recovered).toBe(false);
    expect(result.data.settings.stipendDay).toBeNull();
    expect(result.data.expenses).toEqual([expense]);
  },
);
it.each([null, 1, 31])('loads a valid stipend day %s', (stipendDay) => {
  const stored = { ...data, settings: { ...data.settings, stipendDay } };
  expect(parseStoredData(JSON.stringify(stored))).toEqual({ data: stored, recovered: false });
});
it.each([0, 32, 1.5, '20', {}, true])(
  'recovers invalid stipend day %s without losing the budget',
  (stipendDay) => {
    const result = parseStoredData(
      JSON.stringify({ ...data, settings: { ...data.settings, stipendDay } }),
    );
    expect(result.data.settings).toEqual({ monthlyBudgetMinor: 500000, stipendDay: null });
    expect(result.recovered).toBe(true);
  },
);
