import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
import { STORAGE_KEY } from '../src/storage/storage';
import { data, expense } from './fixtures';
import {
  addNote,
  appTestLifecycle,
  cancelDialog,
  closeSettings,
  editExpense,
  navigate,
  openEntry,
  openSettings,
  receiveRemote,
  seed,
  stored,
} from './appHelpers';

appTestLifecycle();

it('renders the application landmark and opens the current calendar', () => {
  render(<App />);
  expect(screen.getByRole('main', { name: 'Pocket Ledger' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'September 19, 2026, $0.00' })).toHaveAttribute(
    'aria-current',
    'date',
  );
});

it('adds the required scenario and persists the deletion after remounting', () => {
  const { unmount } = render(<App />);
  addNote('1500 grocery #food');
  addNote('600 bus #transport');
  addNote('900 dinner #food');
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('$3,000.00');
  editExpense('Edit dinner');
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('$2,100.00');
  unmount();
  render(<App />);
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('$2,100.00');
  expect(stored().expenses).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Edit dinner' })).not.toBeInTheDocument();
});

it('keeps another month isolated and follows the saved-month hint from the manual form', () => {
  render(<App />);
  openEntry();
  fireEvent.click(screen.getByRole('button', { name: 'prefer a form?' }));
  fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Food' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add an expense' }));
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('$0.00');
  fireEvent.click(screen.getByRole('button', { name: 'View October 2026' }));
  cancelDialog('New entry');
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('$10.00');
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getByRole('button', { name: 'September 19, 2026, $0.00' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  navigate('ledger');
  expect(
    screen.getByRole('heading', { name: 'No expenses in September 2026 yet.' }),
  ).toBeInTheDocument();
});

it('shows the storage recovery notice', () => {
  localStorage.setItem(STORAGE_KEY, 'corrupt');
  render(<App />);
  expect(screen.getByRole('alert')).toHaveTextContent('recovered');
});

it('undoes the latest deletion with the original id', () => {
  render(<App />);
  addNote('25 lunch #food');
  const originalId = stored().expenses[0].id;
  editExpense('Edit lunch');
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('$0.00');
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('$25.00');
  expect(stored().expenses[0].id).toBe(originalId);
  expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  expect(screen.getByText('Expense restored.')).toBeInTheDocument();
});

it('filters the ledger, toggles off, clears explicitly, and resets when changing month', () => {
  render(<App />);
  addNote('10 lunch #food');
  addNote('20 bus #transport');
  navigate('ledger');
  fireEvent.click(screen.getByRole('button', { name: 'Filter Food' }));
  expect(screen.getAllByRole('button', { name: 'Edit lunch' })).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Edit bus' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Filter Food' }));
  expect(screen.getAllByRole('button', { name: 'Edit bus' })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Filter Food' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
  expect(screen.getAllByRole('button', { name: 'Edit bus' })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Filter Food' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByRole('button', { name: 'Clear filter' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getAllByRole('button', { name: /^Edit (lunch|bus)$/ })).toHaveLength(4);
  navigate('calendar');
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('$30.00');
});

it('persists budget edits through the settings dialog', () => {
  const { unmount } = render(<App />);
  openSettings();
  fireEvent.change(screen.getByLabelText('Monthly budget (USD)'), { target: { value: '5000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
  expect(screen.getByLabelText('Budget remaining')).toHaveTextContent('USD 5,000');
  closeSettings();
  unmount();
  render(<App />);
  openSettings();
  expect(screen.getByLabelText('Budget amount')).toHaveTextContent('USD 5,000');
});

it('opens the live settings dialog through the budget footer', () => {
  render(<App />);
  navigate('budget');
  fireEvent.click(screen.getByRole('button', { name: 'settings' }));
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Monthly budget (USD)'), { target: { value: '900' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
  closeSettings();
  expect(screen.getByLabelText('Monthly limit')).toHaveValue('900.00');
  expect(stored().settings.monthlyBudgetMinor).toBe(90000);
});

it('explains when Undo cannot restore into a refilled full ledger', () => {
  seed({
    ...data,
    expenses: Array.from({ length: 10000 }, (_, index) => ({
      ...expense,
      id: String(index),
      date: index === 0 ? '2026-09-19' : '2026-08-01',
    })),
  });
  render(<App />);
  editExpense('Edit Food expense');
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  addNote('10 refill #food');
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(
    screen.getByText('Could not restore: the 10,000-record limit was reached.'),
  ).toBeInTheDocument();
  expect(stored().expenses).toHaveLength(10000);
  expect(stored().expenses.some((item) => item.id === '0')).toBe(false);
});

it('clears a category when its final matching expense is deleted and keeps undo unfiltered', () => {
  render(<App />);
  addNote('10 lunch #food');
  addNote('20 bus #transport');
  navigate('ledger');
  fireEvent.click(screen.getByRole('button', { name: 'Filter Food' }));
  editExpense('Edit lunch');
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(screen.getByRole('button', { name: 'Clear filter' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getAllByRole('button', { name: 'Edit bus' })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getAllByRole('button', { name: /^Edit (lunch|bus)$/ })).toHaveLength(4);
});

it('updates safe spending through add, delete and undo while retaining stipend settings', () => {
  const { unmount } = render(<App />);
  openSettings();
  fireEvent.change(screen.getByLabelText('Monthly budget (USD)'), { target: { value: '1200' } });
  fireEvent.change(screen.getByLabelText('Stipend day (optional)'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
  expect(screen.getByText('Safe to spend today: USD 100')).toBeInTheDocument();
  closeSettings();
  addNote('600 groceries #food');
  expect(screen.getByText('$50.00/day')).toBeInTheDocument();
  editExpense('Edit groceries');
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(screen.getByText('$100.00/day')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByText('$50.00/day')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  openSettings();
  expect(screen.queryByText(/Safe to spend today/)).not.toBeInTheDocument();
  expect(screen.getByText('Stipend in 12 days (Oct 1, 2026)')).toBeInTheDocument();
  unmount();
  render(<App />);
  openSettings();
  expect(screen.getByLabelText('Budget amount')).toHaveTextContent('USD 1,200');
  expect(screen.getByText('Safe to spend today: USD 50')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  expect(screen.getByText('Stipend in 12 days (Oct 1, 2026)')).toBeInTheDocument();
});

it('saves an expense when randomUUID is unavailable', () => {
  vi.stubGlobal('crypto', {});
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  render(<App />);
  addNote('15 lunch #food');
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('$15.00');
  expect(stored().expenses[0].id).toMatch(/^[a-z0-9]+$/);
});

it('edits a stored expense and preserves its identity across reloads', () => {
  seed(data);
  const { unmount } = render(<App />);
  navigate('ledger');
  editExpense('Edit Food expense');
  fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: '12.50' } });
  fireEvent.change(screen.getByLabelText('Description (optional)'), {
    target: { value: 'Edited lunch' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByText('Expense updated.')).toBeInTheDocument();
  expect(stored().expenses[0]).toMatchObject({
    id: 'one',
    amountMinor: 1250,
    description: 'Edited lunch',
  });
  unmount();
  render(<App />);
  navigate('ledger');
  expect(screen.getAllByRole('button', { name: 'Edit Edited lunch' })[0]).toHaveTextContent(
    '$12.50',
  );
});

it('refuses to recreate an edited expense that another tab has deleted', () => {
  seed(data);
  render(<App />);
  navigate('ledger');
  editExpense('Edit Food expense');
  receiveRemote({ ...data, expenses: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByText('This expense was deleted in another tab.')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(stored().expenses).toEqual([]);
});

it('opens entry for a selected calendar day and dismisses a saved notice', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'September 8, 2026, $0.00' }));
  fireEvent.click(
    within(screen.getByRole('region', { name: 'Selected day' })).getByRole('button', {
      name: /add to this day/,
    }),
  );
  fireEvent.change(screen.getByLabelText('TYPE IT LIKE A NOTE'), {
    target: { value: '8 coffee #food' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^add$/ }));
  expect(stored().expenses[0].date).toBe('2026-09-08');
  expect(screen.getByText('Added $8.00 to September 2026.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }));
  expect(screen.queryByText('Added $8.00 to September 2026.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'budget →' }));
  expect(screen.getByRole('heading', { name: 'Budget' })).toBeInTheDocument();
});
