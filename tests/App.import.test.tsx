import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from '../src/App';
import {
  appTestLifecycle,
  csvFile,
  navigate,
  openEntry,
  receiveRemote,
  seed,
  stored,
} from './appHelpers';
import { empty, expense } from './fixtures';

appTestLifecycle();
const csv = 'date,description,category,amount,fixed\n2026-09-19,Lunch,Food,12.50,false';
function openImport() {
  navigate('ledger');
  fireEvent.click(screen.getAllByRole('button', { name: 'import csv' })[0]);
}
const selectCsv = () =>
  fireEvent.change(screen.getByLabelText('Choose CSV'), { target: { files: [csvFile(csv)] } });

it('imports parsed expenses with real generated IDs and persists them after reload', async () => {
  const { unmount } = render(<App />);
  openImport();
  selectCsv();
  await screen.findByText('Ready to import 1 expenses.');
  fireEvent.click(screen.getByRole('button', { name: 'Import expenses' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Imported 1 expenses.')).toBeInTheDocument();
  expect(stored().expenses[0]).toEqual({
    id: '00000000-0000-4000-8000-000000000001',
    amountMinor: 1250,
    category: 'Food',
    description: 'Lunch',
    date: '2026-09-19',
    createdAt: new Date(2026, 8, 19, 12).getTime(),
  });
  unmount();
  render(<App />);
  navigate('ledger');
  expect(screen.getAllByRole('button', { name: 'Edit Lunch' })[0]).toHaveTextContent('$12.50');
});

it('lists later imported rows first for a shared date and recent-entry suggestions', async () => {
  const { unmount } = render(<App />);
  openImport();
  const batch = csv + '\n2026-09-19,Dinner,Food,20,false\n2026-09-19,Taxi,Transportation,8,false';
  fireEvent.change(screen.getByLabelText('Choose CSV'), { target: { files: [csvFile(batch)] } });
  await screen.findByText('Ready to import 3 expenses.');
  fireEvent.click(screen.getByRole('button', { name: 'Import expenses' }));
  unmount();
  render(<App />);
  navigate('ledger');
  expect(
    screen
      .getAllByRole('button', { name: /^Edit / })
      .map((button) => button.getAttribute('aria-label')),
  ).toEqual(['Edit Taxi', 'Edit Dinner', 'Edit Lunch', 'Edit Taxi', 'Edit Dinner', 'Edit Lunch']);
  openEntry();
  const suggestions = within(screen.getByRole('dialog', { name: 'New entry' })).getAllByRole(
    'button',
    { name: /^↺/ },
  );
  expect(suggestions).toHaveLength(3);
  expect(suggestions[0]).toHaveTextContent('8.00 Taxi #transport');
  expect(suggestions[1]).toHaveTextContent('20.00 Dinner #food');
  expect(suggestions[2]).toHaveTextContent('12.50 Lunch #food');
});

it('cancels an import if another tab fills the ledger after preview', async () => {
  const records = Array.from({ length: 9999 }, (_, index) => ({
    ...expense,
    id: String(index),
    date: '2026-08-01',
  }));
  seed({ ...empty, expenses: records });
  render(<App />);
  openImport();
  selectCsv();
  await screen.findByText('Ready to import 1 expenses.');
  receiveRemote({
    ...empty,
    expenses: [...records, { ...expense, id: 'remote', date: '2026-08-01' }],
  });
  fireEvent.click(screen.getByRole('button', { name: 'Import expenses' }));
  expect(
    screen.getByText('Import cancelled: the 10,000-record limit was reached.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Import CSV' })).toBeInTheDocument();
  expect(stored().expenses).toHaveLength(10000);
  expect(stored().expenses.some((item) => item.description === 'Lunch')).toBe(false);
});

it('protects an import from the entry shortcut and cancels without changing data', () => {
  render(<App />);
  openImport();
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  expect(screen.queryByRole('dialog', { name: 'New entry' })).not.toBeInTheDocument();
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Import CSV' })).getByRole('button', {
      name: 'cancel',
    }),
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(stored().expenses).toEqual([]);
});
