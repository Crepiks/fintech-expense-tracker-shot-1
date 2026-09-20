import { CATEGORIES, type Category } from './categories';
import { parseAmount } from './money';
import type { ExpenseValue } from './types';
import { isValidDate } from './validation';

export type CommandResult =
  | { ok: true; kind: 'expense'; value: ExpenseValue }
  | { ok: true; kind: 'budget'; category: Category | null; amountMinor: number | null }
  | {
      ok: true;
      kind: 'repeat';
      value: { description: string; amountMinor: number; category: Category; day: number };
    }
  | { ok: false; error: string };

export const MONTH_NAMES = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

/** Tags use category names, with the shorter #transport alias for quick entry. */
export function categoryFromTag(tag: string): Category | undefined {
  const name = tag.toLowerCase().replace(/^#/, '');
  return CATEGORIES.find(
    (category) => category.toLowerCase() === (name === 'transport' ? 'transportation' : name),
  );
}

function relativeDate(today: string, weekday: string): string {
  const [year, month, day] = today.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  const index = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(weekday);
  const offset = weekday === 'yesterday' ? 1 : (date.getUTCDay() - index + 7) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function expenseDate(
  note: string,
  today: string,
  defaultDate: string,
): { date: string; description: string } {
  const suffix = note.match(
    /(?:^|\s)(today|yesterday|sun|mon|tue|wed|thu|fri|sat|\d{4}-\d{1,2}-\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2})$/i,
  );
  if (!suffix) return { date: defaultDate, description: note };
  const token = suffix[1].toLowerCase();
  let date = today;
  if (/^\d/.test(token)) date = token;
  else if (token.includes(' ')) {
    const [month, day] = token.split(/\s+/);
    date = `${today.slice(0, 4)}-${String(MONTH_NAMES.indexOf(month) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
  } else if (token !== 'today') date = relativeDate(today, token);
  return { date, description: note.slice(0, suffix.index).trim() };
}

/** Explicit date hints use today; a bare expense uses the selected default date. */
export function parseCommand(text: string, today: string, defaultDate = today): CommandResult {
  if (!isValidDate(today)) return { ok: false, error: 'The current date is invalid.' };
  if (!isValidDate(defaultDate)) return { ok: false, error: 'The selected date is invalid.' };
  const words = text.trim().split(/\s+/);
  const tags = words.filter((word) => word.startsWith('#'));
  if (tags.length > 1) return { ok: false, error: 'Use one category tag.' };
  const category = tags.length ? categoryFromTag(tags[0]) : undefined;
  if (tags.length && !category) return { ok: false, error: 'Choose a known category tag.' };
  const parts = words.filter((word) => !word.startsWith('#'));
  if (!parts.length) return { ok: false, error: 'Enter an amount.' };
  const command = parts[0].toLowerCase();
  if (command === '/budget') {
    if (parts.length !== 2) return { ok: false, error: 'Try /budget #food 450 or /budget 1800.' };
    if (parts[1].toLowerCase() === 'off')
      return { ok: true, kind: 'budget', category: category ?? null, amountMinor: null };
    const amount = parseAmount(parts[1]);
    if (!amount.ok) return amount;
    return { ok: true, kind: 'budget', category: category ?? null, amountMinor: amount.minor };
  }
  if (command === '/repeat') {
    if (parts.length < 4 || parts.at(-1)?.toLowerCase() !== 'monthly') {
      return { ok: false, error: 'Try /repeat phone 25 monthly #other.' };
    }
    const amount = parseAmount(parts[parts.length - 2]);
    if (!amount.ok) return amount;
    return {
      ok: true,
      kind: 'repeat',
      value: {
        description: parts.slice(1, -2).join(' ').slice(0, 200),
        amountMinor: amount.minor,
        category: category ?? 'Other',
        day: Number(today.slice(-2)),
      },
    };
  }
  if (command.startsWith('/')) return { ok: false, error: 'Use /budget or /repeat.' };
  const amount = parseAmount(parts[0]);
  if (!amount.ok) return amount;
  const { date, description } = expenseDate(parts.slice(1).join(' '), today, defaultDate);
  if (!isValidDate(date)) return { ok: false, error: 'Use a real calendar date.' };
  return {
    ok: true,
    kind: 'expense',
    value: {
      amountMinor: amount.minor,
      category: category ?? 'Other',
      date,
      description: description.slice(0, 200),
    },
  };
}
