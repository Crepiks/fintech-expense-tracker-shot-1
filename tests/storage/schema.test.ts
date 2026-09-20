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

const rule = {
  id: 'rent',
  description: 'Rent',
  amountMinor: 80000,
  category: 'Housing',
  day: 31,
  startDate: '2026-01-01',
  lastAppliedMonth: null,
};

it('round-trips optional fixed metadata, category limits and recurring costs', () => {
  const extended = {
    ...data,
    expenses: [
      { ...expense, fixed: true, recurringId: 'rent' },
      { ...expense, id: 'two', fixed: false },
    ],
    settings: {
      ...data.settings,
      categoryLimits: { Food: 20000, Other: 1 },
      recurring: [rule, { ...rule, id: 'gym', lastAppliedMonth: '2026-02' }],
    },
  };
  expect(parseStoredData(JSON.stringify(extended))).toEqual({ data: extended, recovered: false });
});

it.each([
  { fixed: 'yes' },
  { fixed: null },
  { recurringId: 3 },
  { recurringId: '' },
  { recurringId: ' ' },
])('rejects invalid expense metadata %s', (fields) => {
  const result = parseStoredData(
    JSON.stringify({ ...data, expenses: [{ ...expense, ...fields }] }),
  );
  expect(result.data.expenses).toEqual([]);
  expect(result.recovered).toBe(true);
});

it.each([null, [], 4, 'bad'])('recovers invalid category limits %s', (categoryLimits) => {
  const result = parseStoredData(
    JSON.stringify({ ...data, settings: { ...data.settings, categoryLimits } }),
  );
  expect(result).toEqual({ data, recovered: true });
});

it('retains valid limits when other limits are invalid', () => {
  const result = parseStoredData(
    JSON.stringify({
      ...data,
      settings: { ...data.settings, categoryLimits: { Food: 20000, Bad: 1, Fun: 0, Health: '20' } },
    }),
  );
  expect(result.data.settings.categoryLimits).toEqual({ Food: 20000 });
  expect(result.recovered).toBe(true);
});

it.each([null, {}, 'bad'])('recovers malformed recurring collection %s', (recurring) => {
  expect(
    parseStoredData(JSON.stringify({ ...data, settings: { ...data.settings, recurring } })),
  ).toEqual({ data, recovered: true });
});

it.each([
  null,
  [],
  {},
  { ...rule, id: 1 },
  { ...rule, id: '' },
  { ...rule, description: null },
  { ...rule, description: ' ' },
  { ...rule, amountMinor: 0 },
  { ...rule, category: 'bad' },
  { ...rule, day: '1' },
  { ...rule, day: 1.5 },
  { ...rule, day: 0 },
  { ...rule, day: 32 },
  { ...rule, startDate: 1 },
  { ...rule, startDate: '2026-02-30' },
  { ...rule, lastAppliedMonth: undefined },
  { ...rule, lastAppliedMonth: 2 },
  { ...rule, lastAppliedMonth: '2026-13' },
  { ...rule, lastAppliedMonth: 'bad' },
])('drops malformed recurring rules while retaining usable rules', (invalid) => {
  const result = parseStoredData(
    JSON.stringify({ ...data, settings: { ...data.settings, recurring: [invalid, rule] } }),
  );
  expect(result.data.settings.recurring).toEqual([rule]);
  expect(result.recovered).toBe(true);
});

it('normalizes recurring descriptions and discards unknown fields', () => {
  const result = parseStoredData(
    JSON.stringify({
      ...empty,
      settings: { recurring: [{ ...rule, description: ' ' + 'x'.repeat(201), unknown: true }] },
    }),
  );
  expect(result.data.settings.recurring).toEqual([{ ...rule, description: 'x'.repeat(200) }]);
  expect(result.recovered).toBe(false);
});

it('drops duplicate and excessive recurring rules without losing valid rules', () => {
  const recurring = [
    rule,
    rule,
    ...Array.from({ length: 10000 }, (_, i) => ({ ...rule, id: String(i) })),
  ];
  const result = parseStoredData(JSON.stringify({ ...empty, settings: { recurring } }));
  expect(result.data.settings.recurring).toHaveLength(10000);
  expect(result.data.settings.recurring?.at(-1)?.id).toBe('9998');
  expect(result.recovered).toBe(true);
});
