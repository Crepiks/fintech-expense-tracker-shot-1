import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmount } from '../../src/domain/money';

describe('parseAmount', () => {
  it.each([
    ['1500', 150000], ['1 500', 150000], ['1,500', 150000],
    ['1500,50', 150050], ['1500.5', 150050], [' 1\u00a0500.01 ', 150001],
    ['0.01', 1], ['0001.09', 109], ['1,234,567.89', 123456789],
    ['999999999.99', 99999999999],
  ])('parses %s to exact integer minor units', (input, minor) => {
    expect(parseAmount(input)).toEqual({ ok: true, minor });
  });
  it.each([
    ['', 'Enter an amount.'], [' \t\n ', 'Enter an amount.'],
    ['0', 'Amount must be greater than 0.'], ['0.00', 'Amount must be greater than 0.'],
    ['-5', 'Amount must be greater than 0.'],
    ['abc', 'Use digits only, e.g. 1500 or 1500.50.'],
    ['1e5', 'Use digits only, e.g. 1500 or 1500.50.'],
    ['+5', 'Use digits only, e.g. 1500 or 1500.50.'],
    ['1,2,3', 'Use digits only, e.g. 1500 or 1500.50.'],
    ['1.2.3', 'Use digits only, e.g. 1500 or 1500.50.'],
    ['10.555', 'Use at most two decimal places.'],
    ['1000000000', 'Amount is too large.'],
    ['9'.repeat(400), 'Amount is too large.'],
  ])('rejects %s with a helpful error', (input, error) => {
    expect(parseAmount(input)).toEqual({ ok: false, error });
  });
});

it.each([[0, '0'], [150000, '1,500'], [150050, '1,500.5'], [1, '0.01'], [-125, '-1.25']])(
  'formats %i minor units for display', (minor, expected) => {
    expect(formatAmount(minor)).toBe(expected);
  },
);
