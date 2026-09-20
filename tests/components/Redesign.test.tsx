import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { STORAGE_KEY } from '../../src/storage/storage';
import { data, expense } from '../fixtures';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 20, 12));
});
afterEach(() => { vi.useRealTimers(); });
const navigate = (name: string) => fireEvent.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('button', { name }));
it('opens the calendar and selects a day to inspect its real entries', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  render(<App />);
  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /September 1, 2026/ }));
  expect(screen.getByRole('region', { name: 'Selected day' })).toHaveTextContent('$1,500.00');
});
it('adds a note and displays it in the ledger after reload', () => {
  const { unmount } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
  fireEvent.change(screen.getByLabelText('TYPE IT LIKE A NOTE'), { target: { value: '12.50 lunch #food' } });
  fireEvent.click(screen.getByRole('button', { name: /^add$/ }));
  unmount();
  render(<App />);
  navigate('ledger');
  expect(screen.getAllByRole('button', { name: /Edit lunch/ })).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: /Edit lunch/ })[0]).toHaveTextContent('$12.50');
});
it('filters the ledger and opens a real budget view', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, expenses: [expense, { ...expense, id: 'bus', category: 'Transportation', amountMinor: 2000 }] }));
  render(<App />);
  navigate('ledger');
  fireEvent.click(screen.getByRole('button', { name: 'Filter Food' }));
  expect(screen.getAllByRole('button', { name: /Edit Food expense/ })).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Edit Transportation expense' })).not.toBeInTheDocument();
  navigate('budget');
  expect(screen.getByRole('heading', { name: /^Budget$/ })).toBeInTheDocument();
  expect(screen.getByLabelText('Monthly limit')).toHaveValue('5000.00');
});
