import { MAX_AMOUNT_MINOR } from '../config';

type AmountResult = { ok: true; minor: number } | { ok: false; error: string };

/** Parse decimal text into exact minor units, never scaling a floating decimal. */
export function parseAmount(input: string): AmountResult {
  let value = input.trim().replace(/\s/g, '');
  if (!value) return { ok: false, error: 'Enter an amount.' };
  if (value.startsWith('-')) return { ok: false, error: 'Amount must be greater than 0.' };
  value = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(value)
    ? value.replace(/,/g, '')
    : value.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(value)) {
    return { ok: false, error: 'Use digits only, e.g. 1500 or 1500.50.' };
  }
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > 2) return { ok: false, error: 'Use at most two decimal places.' };
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (minor === 0) return { ok: false, error: 'Amount must be greater than 0.' };
  if (minor > MAX_AMOUNT_MINOR) return { ok: false, error: 'Amount is too large.' };
  return { ok: true, minor };
}

const numberFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
export function formatAmount(minor: number): string {
  return numberFormat.format(minor / 100);
}
