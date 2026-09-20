import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import { downloadCsv } from '../src/storage/download';
import { data, empty, expense } from './fixtures';
import {
  addNote,
  appTestLifecycle,
  cancelDialog,
  editExpense,
  navigate,
  openEntry,
  openSettings,
  seed,
  stored,
  submitEntry,
} from './appHelpers';

vi.mock('../src/storage/download', () => ({ downloadCsv: vi.fn() }));
appTestLifecycle();
beforeEach(() => {
  vi.mocked(downloadCsv).mockReset();
});

it('runs a find command as a ledger query and clears the query on month change', () => {
  seed({
    ...data,
    expenses: [expense, { ...expense, id: 'bus', category: 'Transportation', description: 'Bus' }],
  });
  render(<App />);
  addNote(' /FiNd #food ');
  expect(screen.getByRole('heading', { name: 'Ledger' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Filter expenses' })).toHaveValue('#food');
  expect(screen.queryByRole('button', { name: 'Edit Bus' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Filter expenses' }), {
    target: { value: 'note:Bus' },
  });
  expect(screen.getAllByRole('button', { name: 'Edit Bus' })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByRole('textbox', { name: 'Filter expenses' })).toHaveValue('');
});

it('exports the selected month from the ledger', () => {
  seed({
    ...data,
    expenses: [expense, { ...expense, id: 'old', date: '2026-08-01', description: 'Old' }],
  });
  render(<App />);
  navigate('ledger');
  fireEvent.click(screen.getAllByRole('button', { name: 'export csv' })[0]);
  expect(downloadCsv).toHaveBeenCalledWith(
    expect.stringContaining('2026-09-01'),
    'pocket-ledger-2026-09.csv',
  );
  expect(vi.mocked(downloadCsv).mock.calls[0][0]).not.toContain('2026-08-01');
  expect(screen.getByText('Exported September 2026.')).toBeInTheDocument();
});

it('exports a named month from a command without changing the selected calendar', () => {
  seed({ ...data, expenses: [expense, { ...expense, id: 'old', date: '2026-08-01' }] });
  render(<App />);
  addNote('/export AUG csv');
  expect(downloadCsv).toHaveBeenCalledWith(
    expect.stringContaining('2026-08-01'),
    'pocket-ledger-2026-08.csv',
  );
  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
});

it('exports the current month with the short export command', () => {
  render(<App />);
  addNote('/export');
  expect(downloadCsv).toHaveBeenCalledWith(
    expect.stringContaining('date,description,category,amount,fixed'),
    'pocket-ledger-2026-09.csv',
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('keeps malformed export commands open with a useful error', () => {
  render(<App />);
  addNote('/export winter csv');
  expect(screen.getByRole('alert')).toHaveTextContent('Try /export or /export sep csv.');
  expect(downloadCsv).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: 'New entry' })).toBeInTheDocument();
});

it('explains a download failure without losing stored expenses', () => {
  vi.mocked(downloadCsv).mockImplementation(() => {
    throw new Error('Download unavailable');
  });
  seed(data);
  render(<App />);
  addNote('/export');
  expect(
    screen.getByText('Could not download CSV. Please try again in your browser.'),
  ).toBeInTheDocument();
  expect(stored().expenses).toEqual([expense]);
});

it('undoes the last added entry through a command and allows restoring it', () => {
  render(<App />);
  addNote('12 lunch #food');
  const original = stored().expenses[0];
  addNote('/undo');
  expect(stored().expenses).toEqual([]);
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('$0.00');
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(stored().expenses).toEqual([original]);
  addNote('/undo');
  expect(screen.getByRole('alert')).toHaveTextContent('No recent entry to undo.');
});

it('explains an undo command before any new entry exists', () => {
  seed(data);
  render(<App />);
  addNote('/undo');
  expect(screen.getByRole('alert')).toHaveTextContent('No recent entry to undo.');
  expect(stored().expenses).toEqual([expense]);
});

it('does not undo an entry already deleted through its editor', () => {
  render(<App />);
  addNote('12 lunch #food');
  editExpense('Edit lunch');
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  addNote('/undo');
  expect(screen.getByRole('alert')).toHaveTextContent('No recent entry to undo.');
  expect(stored().expenses).toEqual([]);
});

it('keeps an invalid note open and accepts a corrected amount', () => {
  render(<App />);
  addNote('invalid');
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(stored().expenses).toEqual([]);
  submitEntry('9 lunch #food');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(stored().expenses[0].amountMinor).toBe(900);
});

it('saves monthly and category budgets through commands', () => {
  render(<App />);
  addNote('/budget 1800');
  expect(stored().settings.monthlyBudgetMinor).toBe(180000);
  addNote('/budget #food 450');
  expect(stored().settings.categoryLimits).toEqual({ Food: 45000 });
  expect(screen.getByText('Budget limit saved.')).toBeInTheDocument();
  navigate('budget');
  expect(screen.getByLabelText('Monthly limit')).toHaveValue('1800.00');
  expect(screen.getByLabelText('Limit for food')).toHaveValue('450.00');
});

it('creates a recurring fixed expense from the budget page and stops future repetitions', () => {
  render(<App />);
  navigate('budget');
  fireEvent.click(screen.getByRole('button', { name: /Add another from the command bar/ }));
  expect(screen.getByLabelText('TYPE IT LIKE A NOTE')).toHaveValue('/repeat ');
  submitEntry('/repeat phone 25 monthly #other');
  expect(screen.getByText('Monthly fixed cost added.')).toBeInTheDocument();
  expect(stored().settings.recurring).toHaveLength(1);
  expect(stored().expenses[0]).toMatchObject({
    amountMinor: 2500,
    fixed: true,
    description: 'phone',
    date: '2026-09-19',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Stop repeating phone' }));
  expect(stored().settings.recurring).toEqual([]);
  expect(stored().expenses).toHaveLength(1);
  expect(
    screen.getByText('Recurring cost stopped. Existing expenses were kept.'),
  ).toBeInTheDocument();
});

it('refuses new entries at the ledger capacity', () => {
  seed({
    ...empty,
    expenses: Array.from({ length: 10000 }, (_, index) => ({
      ...expense,
      id: String(index),
      date: '2026-08-01',
    })),
  });
  render(<App />);
  addNote('10 lunch #food');
  expect(screen.getByRole('alert')).toHaveTextContent('You have reached 10,000 expenses.');
  expect(stored().expenses).toHaveLength(10000);
});

it('refuses a repeat command at the recurring-cost capacity', () => {
  seed({
    ...empty,
    settings: {
      ...empty.settings,
      recurring: Array.from({ length: 10000 }, (_, index) => ({
        id: String(index),
        description: 'Future cost',
        amountMinor: 100,
        category: 'Other',
        day: 1,
        startDate: '2026-10-01',
        lastAppliedMonth: null,
      })),
    },
  });
  render(<App />);
  addNote('/repeat phone 25 monthly #other');
  expect(screen.getByRole('alert')).toHaveTextContent('You have reached the recurring-cost limit.');
  expect(stored().settings.recurring).toHaveLength(10000);
  expect(stored().expenses).toEqual([]);
});

it('toggles quick entry with Ctrl or Command K and ignores other shortcuts', () => {
  render(<App />);
  fireEvent.keyDown(window, { key: 'k' });
  fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  expect(screen.getByRole('dialog', { name: 'New entry' })).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'K', metaKey: true });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('keeps settings protected from the quick-entry shortcut and closes on Escape', () => {
  render(<App />);
  openSettings();
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  expect(screen.queryByRole('dialog', { name: 'New entry' })).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  cancelDialog('Settings');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('protects an editor from the entry shortcut and cancels without saving changes', () => {
  seed(data);
  render(<App />);
  navigate('ledger');
  editExpense('Edit Food expense');
  fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: '1' } });
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  expect(screen.queryByRole('dialog', { name: 'New entry' })).not.toBeInTheDocument();
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Edit expense' })).getByRole('button', {
      name: 'cancel',
    }),
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(stored().expenses[0].amountMinor).toBe(150000);
});

it('cancels quick entry without saving an unfinished note', () => {
  render(<App />);
  openEntry();
  fireEvent.change(screen.getByLabelText('TYPE IT LIKE A NOTE'), {
    target: { value: '25 lunch #food' },
  });
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'New entry' })).getByRole('button', {
      name: 'cancel',
    }),
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(stored().expenses).toEqual([]);
});
