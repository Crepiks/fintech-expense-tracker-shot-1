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
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
it('renders the application landmark', () => {
  render(<App />);
  expect(screen.getByRole('main', { name: 'Pocket Ledger' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'A clearer picture of your spending.' })).toBeInTheDocument();
});
it('adds the required scenario and persists the deletion after remounting', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  for (const [amount, category] of [['1500', 'Food'], ['600', 'Transportation'], ['900', 'Food']]) {
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
