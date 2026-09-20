import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from '../src/App';
import { data, expense } from './fixtures';
import { addNote, appTestLifecycle, editExpense, navigate, receiveRemote, seed, stored } from './appHelpers';

appTestLifecycle();

it('restores the edited values after undoing the most recently added expense', () => {
  const { unmount } = render(<App />);
  addNote('12 lunch #food');
  const added = stored().expenses[0];
  editExpense('Edit lunch');
  fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: '15' } });
  fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: 'Dinner' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Fun' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Fixed cost (exclude from daily average)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  const edited = { ...added, amountMinor: 1500, description: 'Dinner', category: 'Fun', fixed: true };
  expect(stored().expenses).toEqual([edited]);

  addNote('/undo');
  expect(stored().expenses).toEqual([]);
  expect(screen.getByText('USD 15 expense deleted.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(stored().expenses).toEqual([edited]);
  unmount();
  render(<App />);
  navigate('ledger');
  expect(screen.getAllByRole('button', { name: 'Edit Dinner' })[0]).toHaveTextContent('$15.00');
  expect(stored().expenses).toEqual([edited]);
});

it('restores the latest synced values when an expense is deleted from an older open editor', () => {
  seed(data);
  render(<App />);
  navigate('ledger');
  editExpense('Edit Food expense');
  const changed = { ...expense, amountMinor: 1500, description: 'Dinner', fixed: true };
  receiveRemote({ ...data, expenses: [changed] });
  expect(screen.getByLabelText('Amount (USD)')).toHaveValue('1500.00');
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(stored().expenses).toEqual([]);
  expect(screen.getByText('USD 15 expense deleted.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(stored().expenses).toEqual([changed]);
});

it('does not offer to resurrect an expense already deleted in another tab', () => {
  seed(data);
  render(<App />);
  navigate('ledger');
  editExpense('Edit Food expense');
  receiveRemote({ ...data, expenses: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(screen.getByText('This expense was deleted in another tab.')).toBeInTheDocument();
  expect(screen.queryByRole('dialog', { name: 'Edit expense' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  expect(stored().expenses).toEqual([]);
});
