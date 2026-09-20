import { expect, it } from 'vitest';
import { formatDate, formatMonth, shiftMonth } from '../../src/domain/calendar';

it.each([['2026-09', 1, '2026-10'], ['2026-01', -1, '2025-12'], ['2026-12', 1, '2027-01'], ['0001-01', -1, '0001-01'], ['9999-12', 1, '9999-12']])(
  'shifts %s by %i month within supported calendar', (month, delta, expected) => expect(shiftMonth(month, delta)).toBe(expected),
);
it('formats a month without UTC date parsing', () => expect(formatMonth('2026-09')).toBe('September 2026'));
it('formats a calendar date without changing its day', () => expect(formatDate('2026-09-01')).toBe('Sep 1, 2026'));
