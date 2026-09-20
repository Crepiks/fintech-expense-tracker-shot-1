import { categoryFromTag, MONTH_NAMES } from './command';
import { parseAmount } from './money';
import type { Expense } from './types';
import { isValidDate } from './validation';

type Filter = (expense: Expense) => boolean;

function amountFilter(token: string): Filter | null {
  const match = token.match(/^(>=|<=|>|<|=)(\d+(?:[.,]\d{1,2})?)$/);
  if (!match) return null;
  const amount = /^0+(?:[.,]0{1,2})?$/.test(match[2]) ? { ok: true as const, minor: 0 } : parseAmount(match[2]);
  if (!amount.ok) return null;
  const boundary = amount.minor;
  switch (match[1]) {
    case '>': return expense => expense.amountMinor > boundary;
    case '<': return expense => expense.amountMinor < boundary;
    case '>=': return expense => expense.amountMinor >= boundary;
    case '<=': return expense => expense.amountMinor <= boundary;
    default: return expense => expense.amountMinor === boundary;
  }
}

function dateFilter(start: string, end: string): Filter | null {
  if (!isValidDate(start) || !isValidDate(end) || start > end) return null;
  return expense => expense.date >= start && expense.date <= end;
}

/** All search terms are ANDed; malformed filters deliberately match no entries. */
export function filterExpenses(expenses: Expense[], query: string, month: string): Expense[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...expenses];
  const tokens = normalized.split(/\s+/);
  const filters: Filter[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    let filter: Filter | null;
    if (token.startsWith('#')) {
      const category = categoryFromTag(token);
      filter = category ? expense => expense.category === category : null;
    } else if (/^[<>=]/.test(token)) filter = amountFilter(token);
    else if (MONTH_NAMES.includes(token) && tokens[index + 1]?.includes('..')) {
      if (!/^\d{4}-\d{2}$/.test(month) || !isValidDate(`${month}-01`)) return [];
      const range = tokens[++index].match(/^(\d{1,2})\.\.(\d{1,2})$/);
      if (!range) return [];
      const prefix = `${month.slice(0, 4)}-${String(MONTH_NAMES.indexOf(token) + 1).padStart(2, '0')}`;
      filter = dateFilter(`${prefix}-${range[1].padStart(2, '0')}`, `${prefix}-${range[2].padStart(2, '0')}`);
    } else if (token.includes('..')) {
      const range = token.split('..');
      filter = range.length === 2 ? dateFilter(range[0], range[1]) : null;
    } else {
      const note = token.startsWith('note:') ? token.slice(5) : token;
      filter = note && !note.includes(':') ? expense => (expense.description ?? '').toLowerCase().includes(note) : null;
    }
    if (!filter) return [];
    filters.push(filter);
  }
  return expenses.filter(expense => filters.every(filter => filter(expense)));
}
