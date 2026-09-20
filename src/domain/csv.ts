import type { Expense, ExpenseValue } from './types';
import { validateExpense } from './validation';

type CsvResult = { ok: true; values: ExpenseValue[] } | { ok: false; error: string };
const COLUMNS = ['date', 'description', 'category', 'amount', 'fixed'];
const formulaPrefix = /^[\s]*[=+@-]|^[\t\r]/;

function quote(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Escape formula prefixes and leading apostrophes so our importer can undo it. */
export function exportExpensesCsv(expenses: Expense[]): string {
  const rows = expenses.map((expense) => {
    const description = expense.description ?? '';
    const safeNote =
      formulaPrefix.test(description) || description.startsWith("'")
        ? `'${description}`
        : description;
    return [
      expense.date,
      safeNote,
      expense.category,
      (expense.amountMinor / 100).toFixed(2),
      'fixed' in expense && expense.fixed ? 'true' : 'false',
    ]
      .map(quote)
      .join(',');
  });
  return [COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}

/** A small strict CSV state machine, including escaped quotes and multiline notes. */
function readRows(text: string): string[][] | null {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let closedQuote = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else field += char;
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(field);
      field = '';
      closedQuote = false;
      if (char !== ',') {
        if (row.some((value) => value !== '')) rows.push(row);
        row = [];
        if (char === '\r' && text[index + 1] === '\n') index += 1;
      }
    } else if (char === '"' && !field && !closedQuote) quoted = true;
    else {
      if (closedQuote || char === '"') return null;
      field += char;
    }
  }
  if (quoted) return null;
  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

/** Validate every row before returning values; callers can import all or nothing. */
export function parseExpensesCsv(text: string, today: string): CsvResult {
  const rows = readRows(text.replace(/^\uFEFF/, ''));
  if (!rows) return { ok: false, error: 'CSV has invalid quotation marks.' };
  const header = rows.shift();
  if (
    !header ||
    (header.length !== 4 && header.length !== 5) ||
    header.some((column, index) => column.trim().toLowerCase() !== COLUMNS[index])
  ) {
    return { ok: false, error: 'Use columns: date,description,category,amount,fixed.' };
  }
  if (!rows.length) return { ok: false, error: 'The CSV has no expenses.' };
  if (rows.length > 10000) return { ok: false, error: 'Import at most 10,000 expenses at once.' };
  const values: ExpenseValue[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.length !== header.length)
      return { ok: false, error: `Row ${index + 2}: wrong number of columns.` };
    const [date, rawNote, category, amount, rawFixed = ''] = row;
    const fixed = rawFixed.trim().toLowerCase();
    if (!['', 'true', 'false'].includes(fixed))
      return { ok: false, error: `Row ${index + 2}: fixed must be true or false.` };
    const description =
      rawNote.startsWith("'") && (formulaPrefix.test(rawNote.slice(1)) || rawNote.startsWith("''"))
        ? rawNote.slice(1)
        : rawNote;
    const result = validateExpense(
      { date: date.trim(), description, category: category.trim(), amount },
      today,
    );
    if (!result.ok)
      return { ok: false, error: `Row ${index + 2}: ${Object.values(result.errors).join(' ')}` };
    values.push({ ...result.value, ...(fixed === 'true' ? { fixed: true } : {}) });
  }
  return { ok: true, values };
}
