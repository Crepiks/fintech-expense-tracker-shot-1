import { describe, expect, it } from 'vitest';
import { isValidDate, validateExpense } from '../../src/domain/validation';

const draft = { amount: '1500', category: 'Food', date: '2026-09-01' };

describe('calendar dates', () => {
  it.each(['2026-09-01', '2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31'])(
    'accepts real date %s', (date) => expect(isValidDate(date)).toBe(true),
  );
  it.each(['', '2026-2-01', '2026-02-29', '1900-02-29', '2026-04-31', '0000-01-01', '2026-00-01', '2026-13-01', '2026-01-00', '2026-01-32'])(
    'rejects impossible date %s', (date) => expect(isValidDate(date)).toBe(false),
  );
});

it('normalizes a valid expense with an optional description', () => {
  expect(validateExpense({ ...draft, description: '  Lunch  ' }, '2026-09-19')).toEqual({
    ok: true, value: { amountMinor: 150000, category: 'Food', date: '2026-09-01', description: 'Lunch' }, futureDate: false,
  });
});
it('caps descriptions and marks future dates without rejecting them', () => {
  expect(validateExpense({ ...draft, description: 'x'.repeat(201) }, '2026-08-31')).toEqual({
    ok: true, value: { amountMinor: 150000, category: 'Food', date: '2026-09-01', description: 'x'.repeat(200) }, futureDate: true,
  });
});
it('normalizes an absent description to an empty string', () => {
  expect(validateExpense(draft, '2026-09-01')).toMatchObject({ ok: true, value: { description: '' }, futureDate: false });
});
it('returns all invalid fields together', () => {
  expect(validateExpense({ amount: '', category: '', date: '' }, '2026-09-19')).toEqual({
    ok: false, errors: { amount: 'Enter an amount.', category: 'Choose a category.', date: 'Pick a date.' },
  });
});
it.each([
  [{ ...draft, amount: '0' }, { amount: 'Amount must be greater than 0.' }],
  [{ ...draft, category: 'Unknown' }, { category: 'Choose a category.' }],
  [{ ...draft, date: '2026-02-30' }, { date: 'Pick a date.' }],
])('returns only the invalid field error', (input, errors) => {
  expect(validateExpense(input, '2026-09-19')).toEqual({ ok: false, errors });
});
