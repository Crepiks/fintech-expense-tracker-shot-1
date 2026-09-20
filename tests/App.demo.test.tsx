import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
import { data, expense } from './fixtures';
import {
  appTestLifecycle,
  closeSettings,
  editExpense,
  navigate,
  openSettings,
  seed,
  stored,
} from './appHelpers';

appTestLifecycle();
const loadDemo = () => fireEvent.click(screen.getByRole('button', { name: 'Add demo data' }));
const demoCard = () => within(screen.getByRole('region', { name: 'Explore with demo data' }));

it('loads demo data through Settings and persists the populated calendar, ledger and budget', () => {
  const { unmount } = render(<App />);
  openSettings();
  expect(demoCard().getByText(/September 2026/)).toBeInTheDocument();
  loadDemo();
  expect(demoCard().getByRole('status')).toHaveTextContent(/Added \d+ demo expenses/);
  expect(stored().expenses.length).toBeGreaterThan(80);
  expect(stored().settings.monthlyBudgetMinor).toBe(180000);
  closeSettings();
  expect(screen.getByLabelText('Total spent')).not.toHaveTextContent('$0.00');
  fireEvent.click(screen.getByRole('button', { name: /September 19, 2026/ }));
  expect(screen.getByRole('region', { name: 'Selected day' })).toHaveTextContent(
    'Weekly grocery shop',
  );
  navigate('ledger');
  expect(screen.getAllByRole('button', { name: 'Edit Apartment rent' })[0]).toHaveTextContent(
    '$750.00',
  );
  navigate('budget');
  expect(screen.getByLabelText('Monthly limit')).toHaveValue('1800.00');
  expect(screen.getAllByRole('img', { name: /Cumulative spending/ })[0]).toHaveAttribute(
    'aria-label',
    'Cumulative spending $1,293.11; month-end estimate $1,607.97; limit $1,800.00',
  );
  const saved = stored();
  unmount();
  render(<App />);
  openSettings();
  loadDemo();
  expect(demoCard().getByRole('status')).toHaveTextContent('already present');
  expect(stored()).toEqual(saved);
});

it('preserves existing records and configured limits when adding demos in a navigated month', () => {
  seed(data);
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  openSettings();
  expect(demoCard().getByText(/August 2026/)).toBeInTheDocument();
  loadDemo();
  expect(stored().expenses).toContainEqual(expense);
  expect(stored().settings).toEqual(data.settings);
  expect(stored().expenses.some((item) => item.date === '2026-06-01')).toBe(true);
  expect(stored().expenses.filter((item) => item.date.startsWith('2026-09'))).toEqual([expense]);
});

it('preserves edits to demo expenses and does not duplicate them on rapid repeated clicks', () => {
  render(<App />);
  openSettings();
  loadDemo();
  loadDemo();
  const count = stored().expenses.length;
  closeSettings();
  navigate('ledger');
  editExpense('Edit Apartment rent');
  fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: '800' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  openSettings();
  loadDemo();
  expect(stored().expenses).toHaveLength(count);
  expect(
    stored().expenses.find((item) => item.date === '2026-09-01' && item.fixed)?.amountMinor,
  ).toBe(80000);
});

it('shows capacity errors inside Settings without a partial import', () => {
  const full = {
    ...data,
    expenses: Array.from({ length: 9999 }, (_, index) => ({
      ...expense,
      date: '2020-01-01',
      id: String(index),
    })),
  };
  seed(full);
  render(<App />);
  openSettings();
  loadDemo();
  expect(demoCard().getByRole('alert')).toHaveTextContent('10,000-record limit');
  expect(stored()).toEqual(full);
  expect(demoCard().queryByText(/Added \d+ demo expenses/)).not.toBeInTheDocument();
});

it('restores just one deleted example after reload and reports a single addition', () => {
  const { unmount } = render(<App />);
  openSettings();
  loadDemo();
  const original = stored();
  closeSettings();
  navigate('ledger');
  editExpense('Edit Apartment rent');
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(stored().expenses).toHaveLength(original.expenses.length - 1);
  unmount();
  render(<App />);
  openSettings();
  loadDemo();
  expect(demoCard().getByRole('status')).toHaveTextContent('Added 1 demo expense.');
  expect(stored().expenses).toHaveLength(original.expenses.length);
  expect(stored().expenses).toEqual(expect.arrayContaining(original.expenses));
  expect(stored().settings).toEqual(original.settings);
});

it('keeps storage failures visible in the modal and retries saving without adding duplicates', () => {
  render(<App />);
  const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  openSettings();
  loadDemo();
  expect(demoCard().getByRole('alert')).toHaveTextContent('Could not save');
  expect(stored().expenses).toHaveLength(0);
  fail.mockRestore();
  loadDemo();
  expect(demoCard().queryByRole('alert')).not.toBeInTheDocument();
  expect(stored().expenses.length).toBeGreaterThan(80);
  const saved = stored();
  loadDemo();
  expect(stored()).toEqual(saved);
});
