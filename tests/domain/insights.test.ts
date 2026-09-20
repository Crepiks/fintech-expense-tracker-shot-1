import { describe, expect, it } from 'vitest';
import {
  calendarCells,
  calendarShade,
  dateLabel,
  daysInMonth,
  monthInsights,
} from '../../src/domain/insights';
import type { Expense, RecurringCost } from '../../src/domain/types';

const expense = (date: string, amountMinor: number, extra: Partial<Expense> = {}): Expense => ({
  id: date,
  date,
  amountMinor,
  category: 'Food',
  createdAt: 1,
  ...extra,
});
const recurring = (extra: Partial<RecurringCost> = {}): RecurringCost => ({
  id: 'rent',
  description: 'Rent',
  amountMinor: 50000,
  category: 'Housing',
  day: 25,
  startDate: '2026-01-01',
  lastAppliedMonth: null,
  ...extra,
});

describe('date-only calendar helpers', () => {
  it.each([
    ['2026-09-20', 'SUN · SEP 20'],
    ['0001-01-01', 'MON · JAN 1'],
    ['9999-12-31', 'FRI · DEC 31'],
    ['2024-02-29', 'THU · FEB 29'],
  ])('labels %s without shifting its date', (date, expected) => {
    expect(dateLabel(date)).toBe(expected);
  });

  it.each([
    ['2026-09', 30],
    ['2026-01', 31],
    ['2026-02', 28],
    ['2024-02', 29],
    ['1900-02', 28],
    ['2000-02', 29],
    ['0001-02', 28],
    ['9999-12', 31],
  ])('counts the days in %s', (month, expected) => {
    expect(daysInMonth(month)).toBe(expected);
  });

  it.each(['2026-00', '2026-13', '0000-01', '10000-01', '2026-1', 'bad'])(
    'rejects invalid month %s',
    (month) => {
      expect(() => daysInMonth(month)).toThrow(RangeError);
    },
  );

  it.each(['2026-02-29', '2026-09-00', '2026-09-31', '2026-09-1', 'bad'])(
    'rejects invalid date %s',
    (date) => {
      expect(() => dateLabel(date)).toThrow(RangeError);
    },
  );

  it('pads a September calendar to complete Monday-first weeks', () => {
    const cells = calendarCells('2026-09');
    expect(cells).toHaveLength(35);
    expect(cells[0]).toEqual({ date: '2026-08-31', day: 31, inMonth: false });
    expect(cells[1]).toEqual({ date: '2026-09-01', day: 1, inMonth: true });
    expect(cells[30]).toEqual({ date: '2026-09-30', day: 30, inMonth: true });
    expect(cells[34]).toEqual({ date: '2026-10-04', day: 4, inMonth: false });
  });

  it('keeps a four-week February calendar at four weeks', () => {
    const cells = calendarCells('2021-02');
    expect(cells).toHaveLength(28);
    expect(cells.every((cell) => cell.inMonth)).toBe(true);
  });

  it('uses six weeks when a Sunday-start month requires them', () => {
    const cells = calendarCells('2026-03');
    expect(cells).toHaveLength(42);
    expect(cells[0].date).toBe('2026-02-23');
    expect(cells[41].date).toBe('2026-04-05');
  });

  it('keeps the earliest supported month within the date range', () => {
    const cells = calendarCells('0001-01');
    expect(cells[0]).toEqual({ date: '0001-01-01', day: 1, inMonth: true });
    expect(cells).toHaveLength(35);
  });

  it('leaves unsupported year padding blank at the upper calendar boundary', () => {
    const cells = calendarCells('9999-12');
    expect(cells).toHaveLength(35);
    expect(cells[32]).toEqual({ date: '9999-12-31', day: 31, inMonth: true });
    expect(cells.slice(33)).toEqual([
      { date: '', day: 0, inMonth: false },
      { date: '', day: 0, inMonth: false },
    ]);
  });
});

describe('calendar spending shades', () => {
  it.each([
    [0, 0],
    [1, 1],
    [1499, 1],
    [1500, 2],
    [2999, 2],
    [3000, 3],
    [4999, 3],
    [5000, 4],
    [999999, 4],
  ])('shades %i variable minor units as level %i', (amount, shade) => {
    expect(calendarShade(amount)).toBe(shade);
  });
});

describe('monthly insights', () => {
  it('returns empty current-month insights with no budget', () => {
    expect(monthInsights([], '2026-09', '2026-09-03', null)).toEqual({
      totalMinor: 0,
      fixedMinor: 0,
      variableMinor: 0,
      variableAverageMinor: 0,
      elapsedDays: 3,
      days: 30,
      remainingMinor: null,
      safePerDayMinor: null,
      noSpendDays: 3,
      forecastMinor: 0,
      paceMinor: null,
      actualPoints: [0, 0, 0, 0],
      futureFixedMinor: 0,
      monthFixedMinor: 0,
    });
  });

  it('filters other months and totals fixed and flexible records including future entries', () => {
    const result = monthInsights(
      [
        expense('2026-09-01', 30000, { fixed: true }),
        expense('2026-09-01', 300),
        expense('2026-09-02', 600),
        expense('2026-09-25', 1000),
        expense('2026-09-28', 5000, { fixed: true }),
        expense('2026-08-20', 99999),
      ],
      '2026-09',
      '2026-09-03',
      60000,
    );
    expect(result).toEqual({
      totalMinor: 36900,
      fixedMinor: 35000,
      variableMinor: 1900,
      variableAverageMinor: 300,
      elapsedDays: 3,
      days: 30,
      remainingMinor: 23100,
      safePerDayMinor: 825,
      noSpendDays: 1,
      forecastMinor: 44000,
      paceMinor: 37500,
      actualPoints: [0, 30300, 30900, 30900],
      futureFixedMinor: 5000,
      monthFixedMinor: 35000,
    });
  });

  it('uses scheduled flexible spending as a forecast floor without double-counting it', () => {
    const result = monthInsights(
      [expense('2026-09-01', 300), expense('2026-09-25', 9000)],
      '2026-09',
      '2026-09-03',
      10000,
    );
    expect(result.variableAverageMinor).toBe(100);
    expect(result.forecastMinor).toBe(9300);
  });

  it('rounds the observed daily variable average to whole minor units', () => {
    const result = monthInsights([expense('2026-09-01', 100)], '2026-09', '2026-09-03', null);
    expect(result.variableAverageMinor).toBe(33);
    expect(result.forecastMinor).toBe(1000);
  });

  it('counts a day with a fixed expense as a spending day', () => {
    const result = monthInsights(
      [expense('2026-09-01', 100, { fixed: true })],
      '2026-09',
      '2026-09-03',
      null,
    );
    expect(result.noSpendDays).toBe(2);
  });

  it('clamps safe daily spending and flexible pace when over budget', () => {
    const result = monthInsights(
      [expense('2026-09-01', 20000, { fixed: true })],
      '2026-09',
      '2026-09-30',
      10000,
    );
    expect(result.remainingMinor).toBe(-10000);
    expect(result.safePerDayMinor).toBe(0);
    expect(result.paceMinor).toBe(20000);
    expect(result.forecastMinor).toBe(20000);
  });

  it('uses complete historical months and does not project missing recurrence', () => {
    const result = monthInsights([expense('2024-02-29', 2900)], '2024-02', '2026-09-20', 10000, [
      recurring(),
    ]);
    expect(result.elapsedDays).toBe(29);
    expect(result.variableAverageMinor).toBe(100);
    expect(result.forecastMinor).toBe(2900);
    expect(result.safePerDayMinor).toBeNull();
    expect(result.paceMinor).toBe(10000);
    expect(result.noSpendDays).toBe(28);
    expect(result.actualPoints).toHaveLength(30);
    expect(result.actualPoints[29]).toBe(2900);
    expect(result.futureFixedMinor).toBe(0);
  });

  it('uses only scheduled records and recurring costs for a future month', () => {
    const result = monthInsights(
      [expense('2026-10-01', 1200), expense('2026-10-02', 500, { fixed: true })],
      '2026-10',
      '2026-09-20',
      60000,
      [recurring()],
    );
    expect(result).toEqual({
      totalMinor: 1700,
      fixedMinor: 500,
      variableMinor: 1200,
      variableAverageMinor: 0,
      elapsedDays: 0,
      days: 31,
      remainingMinor: 58300,
      safePerDayMinor: null,
      noSpendDays: 0,
      forecastMinor: 51700,
      paceMinor: 50500,
      actualPoints: [0],
      futureFixedMinor: 50500,
      monthFixedMinor: 50500,
    });
  });

  it('reserves upcoming recurring fixed costs for safe spending and pace', () => {
    const result = monthInsights([], '2026-09', '2026-09-20', 61000, [recurring()]);
    expect(result.forecastMinor).toBe(50000);
    expect(result.futureFixedMinor).toBe(50000);
    expect(result.safePerDayMinor).toBe(1000);
    expect(result.paceMinor).toBe(57333);
    expect(result.remainingMinor).toBe(61000);
  });

  it('never adds a recurring cost already recorded in the selected month', () => {
    const result = monthInsights(
      [expense('2026-09-25', 50000, { recurringId: 'rent', fixed: true })],
      '2026-09',
      '2026-09-20',
      null,
      [recurring()],
    );
    expect(result.forecastMinor).toBe(50000);
    expect(result.futureFixedMinor).toBe(50000);
  });

  it('does not treat a previous month recurring record as this month occurrence', () => {
    const result = monthInsights(
      [expense('2026-08-25', 50000, { recurringId: 'rent', fixed: true })],
      '2026-09',
      '2026-09-20',
      null,
      [recurring()],
    );
    expect(result.forecastMinor).toBe(50000);
  });

  it.each([
    { startDate: '2026-10-01' },
    { startDate: '2026-09-26' },
    { day: 20 },
    { day: 19 },
    { lastAppliedMonth: '2026-09' },
    { lastAppliedMonth: '2026-10' },
  ])('does not reserve inactive, elapsed, or already-applied recurrence %j', (update) => {
    const result = monthInsights([], '2026-09', '2026-09-20', 60000, [recurring(update)]);
    expect(result.futureFixedMinor).toBe(0);
    expect(result.forecastMinor).toBe(0);
  });

  it('clamps recurring day 31 to a shorter month and permits an earlier applied month', () => {
    const result = monthInsights([], '2026-02', '2026-02-27', null, [
      recurring({
        day: 31,
        startDate: '2026-02-28',
        lastAppliedMonth: '2026-01',
      }),
    ]);
    expect(result.forecastMinor).toBe(50000);
  });

  it('keeps cumulative charts bounded at the supported year limits', () => {
    expect(monthInsights([], '0001-01', '0001-01-01', 0).actualPoints).toEqual([0, 0]);
    expect(monthInsights([], '9999-12', '9999-12-31', 0).actualPoints).toHaveLength(32);
  });
});
