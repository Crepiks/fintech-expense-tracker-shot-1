import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ExpenseEditor } from '../../src/components/ExpenseEditor';
import type { Expense } from '../../src/domain/types';

const expense: Expense = { id: 'one', date: '2026-09-19', description: 'Lunch', category: 'Food', amountMinor: 1250, createdAt: 1 };
const props = () => ({ expense, today: '2026-09-20', onSave: vi.fn(), onDelete: vi.fn(), onClose: vi.fn() });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

it('starts with the existing expense values without saving changes', () => {
  const callbacks = props();
  render(<ExpenseEditor {...callbacks} />);
  expect(screen.getByRole('dialog', { name: 'Edit expense' })).toHaveAttribute('open');
  expect(screen.getByLabelText('Amount (USD)')).toHaveValue('12.50');
  expect(screen.getByLabelText('Category')).toHaveValue('Food');
  expect(screen.getByLabelText('Date')).toHaveValue('2026-09-19');
  expect(screen.getByLabelText('Description (optional)')).toHaveValue('Lunch');
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(callbacks.onSave).not.toHaveBeenCalled();
});

it('saves normalized changes to every editable field', () => {
  const callbacks = props();
  render(<ExpenseEditor {...callbacks} />);
  fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: '20.75' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Transportation' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-18' } });
  fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: '  Bus pass  ' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Fixed cost (exclude from daily average)' }));
  save();
  expect(callbacks.onSave).toHaveBeenCalledWith({
    amountMinor: 2075, category: 'Transportation', date: '2026-09-18', description: 'Bus pass', fixed: true,
  });
});

it('supports an absent note and removing a fixed-cost flag', () => {
  const callbacks = props();
  render(<ExpenseEditor {...callbacks} expense={{ ...expense, description: undefined, fixed: true }} />);
  expect(screen.getByLabelText('Description (optional)')).toHaveValue('');
  expect(screen.getByRole('checkbox')).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox'));
  save();
  expect(callbacks.onSave).toHaveBeenCalledWith({
    amountMinor: 1250, category: 'Food', date: '2026-09-19', description: '', fixed: false,
  });
});

it('reports every invalid field and blocks saving until corrected', () => {
  const callbacks = props();
  render(<ExpenseEditor {...callbacks} />);
  fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });
  save();
  expect(screen.getAllByRole('alert').map(alert => alert.textContent)).toEqual(['Enter an amount.', 'Choose a category.', 'Pick a date.']);
  expect(screen.getByLabelText('Amount (USD)')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Date')).toHaveAttribute('aria-invalid', 'true');
  expect(callbacks.onSave).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Other' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-20' } });
  save();
  expect(callbacks.onSave).toHaveBeenCalledWith({ amountMinor: 100, category: 'Other', date: '2026-09-20', description: 'Lunch', fixed: false });
});

it.each([
  ['0', 'Amount must be greater than 0.'], ['1.234', 'Use at most two decimal places.'],
  ['no money', 'Use digits only, e.g. 1500 or 1500.50.'],
])('explains invalid amount %s without saving', (amount, message) => {
  const callbacks = props();
  render(<ExpenseEditor {...callbacks} />);
  fireEvent.change(screen.getByLabelText('Amount (USD)'), { target: { value: amount } });
  save();
  expect(screen.getByRole('alert')).toHaveTextContent(message);
  expect(callbacks.onSave).not.toHaveBeenCalled();
});

it('warns about a future date while allowing the user to save it', () => {
  const callbacks = props();
  render(<ExpenseEditor {...callbacks} />);
  expect(screen.queryByText('This date is in the future.')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-01' } });
  expect(screen.getByText('This date is in the future.')).toBeInTheDocument();
  save();
  expect(callbacks.onSave).toHaveBeenCalledWith({
    amountMinor: 1250, category: 'Food', date: '2026-10-01', description: 'Lunch', fixed: false,
  });
});

it('deletes the selected expense without submitting the edit form', () => {
  const callbacks = props();
  render(<ExpenseEditor {...callbacks} />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(callbacks.onDelete).toHaveBeenCalledOnce();
  expect(callbacks.onSave).not.toHaveBeenCalled();
});

it('cancels edits through either the button or dialog cancellation', () => {
  const callbacks = props();
  render(<ExpenseEditor {...callbacks} />);
  fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
  fireEvent(screen.getByRole('dialog', { name: 'Edit expense' }), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(callbacks.onClose).toHaveBeenCalledTimes(2);
  expect(callbacks.onSave).not.toHaveBeenCalled();
});
