import { expect, it } from 'vitest';
import { prepareDemoData } from '../../src/domain/demo';
import { parseStoredData } from '../../src/storage/schema';
import { empty, expense } from '../fixtures';

it('builds varied, valid expenses for the selected month and two previous months', () => {
  const result = prepareDemoData(empty, '2026-09', '2026-09-19');
  expect(result.error).toBe('');
  expect(result.added).toBeGreaterThan(80);
  expect(new Set(result.data.expenses.map(item => item.date.slice(0, 7))))
    .toEqual(new Set(['2026-07', '2026-08', '2026-09']));
  expect(new Set(result.data.expenses.map(item => item.category)).size).toBe(7);
  expect(result.data.expenses).toContainEqual(expect.objectContaining({
    date: '2026-09-01', description: 'Apartment rent', amountMinor: 75000, fixed: true,
  }));
  expect(result.data.expenses.some(item => !item.fixed && item.date > '2026-09-19')).toBe(false);
  expect(result.data.expenses.some(item => item.fixed && item.date > '2026-09-19')).toBe(true);
  expect(parseStoredData(JSON.stringify(result.data))).toEqual({ data: result.data, recovered: false });
  expect(result.data.settings.monthlyBudgetMinor).toBe(180000);
  expect(result.data.settings.categoryLimits?.Food).toBe(40000);
  expect(empty.expenses).toEqual([]);
});

it('preserves every existing expense and leaves an established tracker’s settings intact', () => {
  const state = { ...empty, expenses: [expense] };
  const result = prepareDemoData(state, '2026-09', '2026-09-19');
  expect(result.data.expenses[0]).toBe(expense);
  expect(result.data.settings).toBe(state.settings);
  expect(state.expenses).toEqual([expense]);
});

it.each([
  { monthlyBudgetMinor: 250000 },
  { stipendDay: 15 },
  { categoryLimits: { Food: 12000 } },
  { recurring: [{ id: 'gym', description: 'Gym', category: 'Health' as const, amountMinor: 2500, day: 1, startDate: '2026-09-01', lastAppliedMonth: null }] },
])('preserves configured settings even without expenses: %j', settings => {
  const state = { ...empty, settings: { ...empty.settings, ...settings } };
  expect(prepareDemoData(state, '2026-09', '2026-09-19').data.settings).toBe(state.settings);
});

it('initializes example limits when optional settings collections are empty', () => {
  const state = { ...empty, settings: { ...empty.settings, categoryLimits: {}, recurring: [] } };
  expect(prepareDemoData(state, '2026-09', '2026-09-19').data.settings.monthlyBudgetMinor).toBe(180000);
});

it('does not duplicate records or overwrite edited demo records and settings on repeat', () => {
  const first = prepareDemoData(empty, '2026-09', '2026-09-19').data;
  const edited = { ...first, expenses: first.expenses.map((item, index) => index === 0
    ? { ...item, amountMinor: 1234, description: 'My edited record', date: '2025-01-01' } : item), settings: empty.settings };
  const result = prepareDemoData(edited, '2026-09', '2026-09-19');
  expect(result).toEqual({ data: edited, added: 0, error: '' });
  expect(result.data).toBe(edited);
});

it('deduplicates overlapping month ranges and adds only newly due purchases later', () => {
  const first = prepareDemoData(empty, '2026-09', '2026-09-01').data;
  const later = prepareDemoData(first, '2026-09', '2026-09-19');
  expect(later.added).toBeGreaterThan(0);
  expect(later.data.expenses).toEqual(expect.arrayContaining(first.expenses));
  const adjacent = prepareDemoData(later.data, '2026-10', '2026-09-19');
  expect(adjacent.data.expenses.filter(item => item.date.startsWith('2026-09')))
    .toEqual(later.data.expenses.filter(item => item.date.startsWith('2026-09')));
  expect(adjacent.data.expenses.filter(item => item.date.startsWith('2026-10')).every(item => item.fixed)).toBe(true);
  expect(new Set(adjacent.data.expenses.map(item => item.id)).size).toBe(adjacent.data.expenses.length);
});

it.each(['2024-02', '2025-02', '2026-01', '0001-01', '9999-12'])('handles short months, year rollover and supported date bounds: %s', month => {
  const result = prepareDemoData(empty, month, '9999-12-31');
  expect(parseStoredData(JSON.stringify(result.data)).recovered).toBe(false);
  expect(new Set(result.data.expenses.map(item => item.id)).size).toBe(result.added);
  expect(result.data.expenses.some(item => item.date.startsWith(month))).toBe(true);
});

it('rejects the whole batch above the record limit without modifying data or settings', () => {
  const state = { ...empty, expenses: Array.from({ length: 9999 }, (_, index) => ({ ...expense, id: String(index) })) };
  const result = prepareDemoData(state, '2026-09', '2026-09-19');
  expect(result.data).toBe(state);
  expect(result.added).toBe(0);
  expect(result.error).toContain('10,000');
});

it('allows a batch exactly at capacity and repeated loads at capacity', () => {
  const batch = prepareDemoData(empty, '2026-09', '2026-09-19');
  const state = { ...empty, expenses: Array.from({ length: 10000 - batch.added }, (_, index) => ({ ...expense, id: String(index) })) };
  const result = prepareDemoData(state, '2026-09', '2026-09-19');
  expect(result.data.expenses).toHaveLength(10000);
  expect(result.error).toBe('');
  expect(prepareDemoData(result.data, '2026-09', '2026-09-19')).toEqual({ data: result.data, added: 0, error: '' });
});
