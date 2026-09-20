import { describe, expect, it } from 'vitest';
import { exportExpensesCsv, parseExpensesCsv } from '../../src/domain/csv';
import type { Expense } from '../../src/domain/types';

const today = '2026-09-20';
const header = 'date,description,category,amount,fixed';
const row = '2026-09-12,Lunch,Food,12.50,false';
const expense: Expense = {
  id: 'a',
  date: '2026-09-12',
  description: 'Lunch',
  category: 'Food',
  amountMinor: 1250,
  createdAt: 1,
};

describe('CSV export', () => {
  it('exports decimal amounts with a header and CRLF rows', () => {
    expect(exportExpensesCsv([expense])).toBe(`${header}\r\n${row}\r\n`);
  });
  it('exports an empty ledger with just a header', () => {
    expect(exportExpensesCsv([])).toBe(`${header}\r\n`);
  });
  it('round trips commas, quotation marks, newlines, and fixed entries', () => {
    const value = { ...expense, description: 'Lunch, "friends"\nsecond line', fixed: true };
    expect(exportExpensesCsv([value])).toContain('"Lunch, ""friends""\nsecond line"');
    expect(parseExpensesCsv(exportExpensesCsv([value]), today)).toEqual({
      ok: true,
      values: [
        {
          date: '2026-09-12',
          description: 'Lunch, "friends"\nsecond line',
          category: 'Food',
          amountMinor: 1250,
          fixed: true,
        },
      ],
    });
  });
  it('normalizes an absent note on export', () => {
    expect(exportExpensesCsv([{ ...expense, description: undefined }])).toContain(
      '2026-09-12,,Food,12.50,false',
    );
  });
  it.each(['=SUM(A1)', '+cmd', '-cmd', '@cmd', '\tcmd', '  =SUM(A1)', "'literal", "'=literal"])(
    'escapes formula-like or apostrophe-prefixed note %s reversibly',
    (description) => {
      const csv = exportExpensesCsv([{ ...expense, description }]);
      expect(csv).toContain(`,'${description},`);
      expect(parseExpensesCsv(csv, today)).toMatchObject({
        ok: true,
        values: [{ description: description.trim() }],
      });
    },
  );
});

describe('CSV import', () => {
  it('imports a complete row', () => {
    expect(parseExpensesCsv(`${header}\n${row}`, today)).toEqual({
      ok: true,
      values: [{ date: '2026-09-12', description: 'Lunch', category: 'Food', amountMinor: 1250 }],
    });
  });
  it('accepts BOM, CRLF, and a legacy header without fixed', () => {
    expect(
      parseExpensesCsv(
        '\uFEFFdate,description,category,amount\r\n2026-09-12,,Food,12.50\r\n',
        today,
      ),
    ).toEqual({
      ok: true,
      values: [{ date: '2026-09-12', description: '', category: 'Food', amountMinor: 1250 }],
    });
  });
  it('accepts quoted headers and empty fixed values', () => {
    expect(
      parseExpensesCsv(
        `"date",description,category,amount,fixed\n2026-09-12,Lunch,Food,12.50,`,
        today,
      ),
    ).toMatchObject({ ok: true });
  });
  it('preserves an imported apostrophe that does not escape a formula', () => {
    expect(parseExpensesCsv(`${header}\n2026-09-12,'hello,Food,1,false`, today)).toMatchObject({
      ok: true,
      values: [{ description: "'hello" }],
    });
  });
  it('supports CR row separators and ignores blank lines', () => {
    expect(parseExpensesCsv(`${header}\r\r${row}\r`, today)).toMatchObject({
      ok: true,
      values: [{ description: 'Lunch' }],
    });
  });
  it.each([
    '',
    header,
    'date,amount\n2026-09-12,12.50',
    `${header}\n2026-09-12,Lunch,Food,12.50`,
    `${header}\n2026-09-12,Lunch,Food,12.50,maybe`,
    `${header}\n2026-09-12,Lunch,Unknown,12.50,false`,
    `${header}\n2026-02-30,Lunch,Food,12.50,false`,
    `${header}\n2026-09-12,Lunch,Food,0,false`,
    `${header}\n2026-09-12,"Unclosed,Food,12.50,false`,
    `${header}\n2026-09-12,un"quoted,Food,12.50,false`,
    `${header}\n2026-09-12,"closed"junk,Food,12.50,false`,
  ])('rejects invalid CSV atomically', (csv) => {
    expect(parseExpensesCsv(csv, today)).toMatchObject({ ok: false, error: expect.any(String) });
  });
  it('rejects the whole import when a later row is invalid', () => {
    expect(
      parseExpensesCsv(`${header}\n${row}\n2026-09-12,Lunch,Food,-1,false`, today),
    ).toMatchObject({ ok: false, error: expect.stringContaining('Row 3') });
  });
  it('accepts up to 10000 expenses', () => {
    const result = parseExpensesCsv(`${header}\n${Array(10000).fill(row).join('\n')}`, today);
    expect(result.ok && result.values.length).toBe(10000);
  });
  it('rejects more than 10000 expenses', () => {
    expect(
      parseExpensesCsv(`${header}\n${Array(10001).fill(row).join('\n')}`, today),
    ).toMatchObject({ ok: false });
  });
});
