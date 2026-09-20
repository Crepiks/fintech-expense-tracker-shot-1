import { expect, it } from 'vitest';
import { nextStipend } from '../../src/domain/budget';

it.each([
  ['2026-04-01', 31, '2026-04-30', 29],
  ['2026-02-01', 30, '2026-02-28', 27],
  ['2024-02-01', 30, '2024-02-29', 28],
  ['2026-09-20', 20, '2026-09-20', 0],
  ['2026-09-20', 5, '2026-10-05', 15],
  ['2026-12-20', 5, '2027-01-05', 16],
  ['2026-01-31', 30, '2026-02-28', 28],
  ['2026-03-01', 31, '2026-03-31', 30],
  ['0099-12-20', 5, '0100-01-05', 16],
])('finds the next stipend from %s on day %i', (today, day, date, daysUntil) => {
  expect(nextStipend(today, day)).toEqual({ date, daysUntil });
});
