import { expect, it } from 'vitest';
import { filterExpenses } from '../../src/domain/search';
import type { Expense } from '../../src/domain/types';

const expenses: Expense[] = [
  {
    id: 'a',
    date: '2026-09-10',
    description: 'Lunch with Aida',
    category: 'Food',
    amountMinor: 2000,
    createdAt: 1,
  },
  {
    id: 'b',
    date: '2026-09-17',
    description: 'Bus home',
    category: 'Transportation',
    amountMinor: 2500,
    createdAt: 2,
  },
  {
    id: 'c',
    date: '2026-09-18',
    description: 'Lunch alone',
    category: 'Food',
    amountMinor: 1000,
    createdAt: 3,
  },
  { id: 'd', date: '2026-08-10', category: 'Other', amountMinor: 5000, createdAt: 4 },
];
const search = (query: string, month = '2026-09') =>
  filterExpenses(expenses, query, month).map((item) => item.id);

it('returns every expense in input order for an empty query', () => {
  expect(search('  ')).toEqual(['a', 'b', 'c', 'd']);
});
it('matches plain note text case insensitively and combines words', () => {
  expect(search('LUNCH Aida')).toEqual(['a']);
});
it('filters by an explicit note prefix', () => {
  expect(search('note:lunch')).toEqual(['a', 'c']);
});
it('filters by a category and an amount together', () => {
  expect(search('#food >=20')).toEqual(['a']);
});
it('accepts the shorter transport tag', () => {
  expect(search('#transport')).toEqual(['b']);
});
it.each([
  ['>20', ['b', 'd']],
  ['<20', ['c']],
  ['<=20', ['a', 'c']],
  ['=20', ['a']],
  ['>0', ['a', 'b', 'c', 'd']],
  ['=0', []],
  ['>=25.00', ['b', 'd']],
])('applies comparison %s', (query, ids) => {
  expect(search(query)).toEqual(ids);
});
it('matches an inclusive shorthand date range within the reference year', () => {
  expect(search('sep 10..17')).toEqual(['a', 'b']);
});
it('matches an inclusive ISO date range across months', () => {
  expect(search('2026-08-10..2026-09-10')).toEqual(['a', 'd']);
});
it('combines date ranges and note filters', () => {
  expect(search('sep 10..17 note:lunch')).toEqual(['a']);
});
it.each([
  '#unknown',
  '#',
  '>wat',
  '>1.234',
  '>999999999999999',
  '>=',
  'note:',
  'sep 17..10',
  'feb 29..30',
  '2026-09-18..2026-09-10',
  '2026-00-01..2026-09-10',
  '2026-09-10..2026-09-17..2026-09-20',
  'sep 10..',
  '10..17',
  'amount:20',
])('returns no matches for malformed search %s', (query) => {
  expect(search(query)).toEqual([]);
});
it('rejects an invalid reference month for a shorthand range', () => {
  expect(search('sep 10..17', 'invalid')).toEqual([]);
});
it('does not mutate the source array', () => {
  filterExpenses(Object.freeze([...expenses]) as unknown as Expense[], '#food', '2026-09');
  expect(expenses.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
});
