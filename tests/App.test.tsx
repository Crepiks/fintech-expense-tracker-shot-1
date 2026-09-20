import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import { STORAGE_KEY } from '../src/storage/storage';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 19, 12));
  let nextId = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(
    () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`,
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it('renders the application landmark', () => {
  render(<App />);
  expect(screen.getByRole('main', { name: 'Pocket Ledger' })).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'A clearer picture of your spending.' }),
  ).toBeInTheDocument();
});
it('adds the required scenario and persists the deletion after remounting', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  for (const [amount, category] of [
    ['1500', 'Food'],
    ['600', 'Transportation'],
    ['900', 'Food'],
  ]) {
    await user.type(screen.getByLabelText('Amount (USD)'), amount);
    await user.selectOptions(screen.getByLabelText('Category'), category);
    await user.click(screen.getByRole('button', { name: 'Add an expense' }));
  }
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('USD 3,000');
  const row = screen.getByRole('row', { name: /USD 900/ });
  fireEvent.click(row.querySelector('button')!);
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('USD 2,100');
  unmount();
  render(<App />);
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('USD 2,100');
  expect(screen.getAllByRole('button', { name: 'Delete expense' })).toHaveLength(2);
});
it('keeps another month isolated and follows the saved-month hint', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText('Amount (USD)'), '10');
  await user.selectOptions(screen.getByLabelText('Category'), 'Food');
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-01' } });
  await user.click(screen.getByRole('button', { name: 'Add an expense' }));
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('USD 0');
  await user.click(screen.getByRole('button', { name: 'View October 2026' }));
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('USD 10');
  await user.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getByText('No expenses in September 2026 yet.')).toBeInTheDocument();
});
it('shows the storage recovery notice', () => {
  localStorage.setItem(STORAGE_KEY, 'corrupt');
  render(<App />);
  expect(screen.getByRole('alert')).toHaveTextContent('recovered');
});
it('undoes the latest deletion with the original id', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText('Amount (USD)'), '25');
  await user.selectOptions(screen.getByLabelText('Category'), 'Food');
  await user.click(screen.getByRole('button', { name: 'Add an expense' }));
  const originalId = JSON.parse(localStorage.getItem(STORAGE_KEY)!).expenses[0].id;
  await user.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('USD 0');
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('USD 25');
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).expenses[0].id).toBe(originalId);
  expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
});
it('filters only the list, toggles off, clears explicitly, and resets on month changes', async () => {
  const user = userEvent.setup();
  render(<App />);
  for (const [amount, category] of [
    ['10', 'Food'],
    ['20', 'Transportation'],
  ]) {
    await user.type(screen.getByLabelText('Amount (USD)'), amount);
    await user.selectOptions(screen.getByLabelText('Category'), category);
    await user.click(screen.getByRole('button', { name: 'Add an expense' }));
  }
  await user.click(screen.getByRole('button', { name: 'Filter Food' }));
  expect(screen.getAllByRole('button', { name: 'Delete expense' })).toHaveLength(1);
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('USD 30');
  await user.click(screen.getByRole('button', { name: 'Filter Food' }));
  expect(screen.getAllByRole('button', { name: 'Delete expense' })).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'Filter Food' }));
  expect(screen.getAllByRole('button', { name: 'Delete expense' })).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Clear filter' }));
  expect(screen.getAllByRole('button', { name: 'Delete expense' })).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'Filter Food' }));
  await user.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.queryByRole('button', { name: 'Clear filter' })).not.toBeInTheDocument();
});
it('persists budget edits and derives remaining from the current month', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  await user.type(screen.getByLabelText('Monthly budget (USD)'), '5000');
  await user.click(screen.getByRole('button', { name: 'Save budget' }));
  expect(screen.getByLabelText('Budget remaining')).toHaveTextContent('USD 5,000');
  unmount();
  render(<App />);
  expect(screen.getByLabelText('Budget amount')).toHaveTextContent('USD 5,000');
});
it('explains when Undo cannot restore into a refilled full ledger', async () => {
  const { expense, data } = await import('./fixtures');
  const full = {
    ...data,
    expenses: Array.from({ length: 10000 }, (_, index) => ({
      ...expense,
      id: String(index),
      date: index === 0 ? '2026-09-19' : '2026-08-01',
    })),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Food' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add an expense' }));
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Could not restore');
});

it('clears a filter when its last expense is deleted and leaves undo unfiltered', async () => {
  const user = userEvent.setup();
  render(<App />);
  for (const [amount, category] of [
    ['10', 'Food'],
    ['20', 'Transportation'],
  ]) {
    await user.type(screen.getByLabelText('Amount (USD)'), amount);
    await user.selectOptions(screen.getByLabelText('Category'), category);
    await user.click(screen.getByRole('button', { name: 'Add an expense' }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Filter Food' }));
  expect(screen.getByText('Showing Food only — 1 of 2 expenses')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(screen.queryByRole('button', { name: 'Clear filter' })).not.toBeInTheDocument();
  expect(screen.getByRole('row', { name: /Transportation.*USD 20/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getAllByRole('button', { name: 'Delete expense' })).toHaveLength(2);
});
it('updates budget guidance through add, delete, undo, and keeps stipend after reload', () => {
  const { unmount } = render(<App />);
  fireEvent.change(screen.getByLabelText('Monthly budget (USD)'), { target: { value: '1200' } });
  fireEvent.change(screen.getByLabelText('Stipend day (optional)'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
  expect(screen.getByText('Safe to spend today: USD 100')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: '600' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Food' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add an expense' }));
  expect(screen.getByText('Safe to spend today: USD 50')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(screen.getByText('Safe to spend today: USD 100')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByText('Safe to spend today: USD 50')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.queryByText(/Safe to spend today/)).not.toBeInTheDocument();
  expect(screen.getByText('Stipend in 12 days (Oct 1, 2026)')).toBeInTheDocument();
  unmount();
  render(<App />);
  expect(screen.getByLabelText('Budget amount')).toHaveTextContent('USD 1,200');
  expect(screen.getByText('Stipend in 12 days (Oct 1, 2026)')).toBeInTheDocument();
});
it('can save an expense when randomUUID is unavailable', () => {
  vi.stubGlobal('crypto', {});
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  try {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Food' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add an expense' }));
    expect(screen.getByLabelText('Total spent')).toHaveTextContent('USD 15');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).expenses[0].id).toMatch(/^[a-z0-9]+$/);
  } finally {
    vi.unstubAllGlobals();
  }
});
