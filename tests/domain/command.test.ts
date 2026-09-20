import { describe, expect, it } from 'vitest';
import { parseCommand } from '../../src/domain/command';

const today = '2026-09-20';

describe('expense commands', () => {
  it('parses an amount, note, category, and yesterday', () => {
    expect(parseCommand('12.50 lunch with Aida #food yesterday', today)).toEqual({
      ok: true,
      kind: 'expense',
      value: {
        amountMinor: 1250,
        description: 'lunch with Aida',
        category: 'Food',
        date: '2026-09-19',
      },
    });
  });
  it('defaults to today and Other with an optional note', () => {
    expect(parseCommand(' 25 ', today)).toEqual({
      ok: true,
      kind: 'expense',
      value: { amountMinor: 2500, description: '', category: 'Other', date: today },
    });
  });
  it.each([
    ['today', '2026-09-20'],
    ['sun', '2026-09-20'],
    ['mon', '2026-09-14'],
    ['sat', '2026-09-19'],
    ['sep 12', '2026-09-12'],
    ['2024-02-29', '2024-02-29'],
  ])('resolves %s without changing the note', (suffix, date) => {
    expect(parseCommand(`8 bus #transport ${suffix}`, today)).toEqual({
      ok: true,
      kind: 'expense',
      value: { amountMinor: 800, description: 'bus', category: 'Transportation', date },
    });
  });
  it.each(['food', 'transportation', 'housing', 'study', 'fun', 'health', 'other'])(
    'recognizes #%s',
    (tag) => {
      expect(parseCommand(`1 #${tag}`, today)).toMatchObject({ ok: true, kind: 'expense' });
    },
  );
  it('handles year boundaries for yesterday', () => {
    expect(parseCommand('1 yesterday', '2026-01-01')).toMatchObject({
      value: { date: '2025-12-31' },
    });
  });
  it('caps notes at the existing expense limit', () => {
    expect(parseCommand(`1 ${'a'.repeat(201)}`, today)).toMatchObject({
      value: { description: 'a'.repeat(200) },
    });
  });
  it.each([
    '',
    '#food',
    'lunch',
    '0 lunch',
    '-5 lunch',
    '1.234 lunch',
    '999999999999 lunch',
    '1 #unknown',
    '1 #food #fun',
    '1 #',
    '1 feb 30',
    '1 2026-02-29',
    '/unknown 1',
  ])('rejects incomplete or invalid command %s', (input) => {
    expect(parseCommand(input, today)).toMatchObject({ ok: false, error: expect.any(String) });
  });
  it('rejects an invalid reference date', () => {
    expect(parseCommand('1', 'invalid')).toMatchObject({ ok: false });
  });
  it('rejects relative dates before year one', () => {
    expect(parseCommand('1 yesterday', '0001-01-01')).toMatchObject({ ok: false });
  });
  it('uses a selected date only when the note has no explicit date', () => {
    expect(parseCommand('12 lunch #food', today, '2025-09-01')).toEqual({
      ok: true,
      kind: 'expense',
      value: { amountMinor: 1200, description: 'lunch', category: 'Food', date: '2025-09-01' },
    });
  });
  it.each([
    ['today', '2026-09-20'],
    ['yesterday', '2026-09-19'],
    ['fri', '2026-09-18'],
    ['sep 12', '2026-09-12'],
    ['2024-02-29', '2024-02-29'],
  ])('anchors explicit %s to the current day despite a different selected date', (suffix, date) => {
    expect(parseCommand(`12 lunch #food ${suffix}`, today, '2025-09-01')).toMatchObject({
      ok: true,
      value: { date, description: 'lunch' },
    });
  });
  it('rejects an invalid selected default date', () => {
    expect(parseCommand('12 lunch #food', today, '2026-02-30')).toEqual({
      ok: false,
      error: 'The selected date is invalid.',
    });
  });
});

describe('budget commands', () => {
  it('sets the overall budget', () => {
    expect(parseCommand('/budget 1800', today)).toEqual({
      ok: true,
      kind: 'budget',
      category: null,
      amountMinor: 180000,
    });
  });
  it('sets a category budget', () => {
    expect(parseCommand('/budget #food 450', today)).toEqual({
      ok: true,
      kind: 'budget',
      category: 'Food',
      amountMinor: 45000,
    });
  });
  it('clears a category budget with off', () => {
    expect(parseCommand('/budget #food off', today)).toEqual({
      ok: true,
      kind: 'budget',
      category: 'Food',
      amountMinor: null,
    });
  });
  it('clears the overall budget with off', () => {
    expect(parseCommand('/budget off', today)).toEqual({
      ok: true,
      kind: 'budget',
      category: null,
      amountMinor: null,
    });
  });
  it.each(['/budget', '/budget 0', '/budget 30 lunch'])(
    'rejects invalid budget command %s',
    (input) => {
      expect(parseCommand(input, today)).toMatchObject({ ok: false });
    },
  );
});

describe('recurring commands', () => {
  it('creates a monthly template on today’s day', () => {
    expect(parseCommand('/repeat phone 25 monthly #other', today)).toEqual({
      ok: true,
      kind: 'repeat',
      value: { description: 'phone', amountMinor: 2500, category: 'Other', day: 20 },
    });
  });
  it('supports multiple words and default category', () => {
    expect(parseCommand('/repeat gym membership 40 monthly', '2026-01-31')).toEqual({
      ok: true,
      kind: 'repeat',
      value: { description: 'gym membership', amountMinor: 4000, category: 'Other', day: 31 },
    });
  });
  it.each([
    '/repeat phone 25',
    '/repeat 25 monthly',
    '/repeat phone 0 monthly',
    '/repeat phone 25 weekly',
  ])('rejects invalid recurring command %s', (input) => {
    expect(parseCommand(input, today)).toMatchObject({ ok: false });
  });
  it('starts a monthly recurrence on the actual current day when another date is selected', () => {
    expect(parseCommand('/repeat phone 25 monthly #other', today, '2026-09-01')).toMatchObject({
      ok: true,
      kind: 'repeat',
      value: { description: 'phone', day: 20 },
    });
  });
});
