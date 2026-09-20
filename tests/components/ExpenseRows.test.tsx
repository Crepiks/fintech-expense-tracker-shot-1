import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ExpenseRows } from '../../src/components/ExpenseRows';
import type { Expense } from '../../src/domain/types';

const expense: Expense = { id: 'one', date: '2026-09-20', description: 'Bus pass', category: 'Transportation', amountMinor: 2500, createdAt: 1 };

it('shows the note, short category tag, and exact amount', () => {
  render(<ExpenseRows expenses={[expense]} onEdit={vi.fn()} />);
  const row = screen.getByRole('button', { name: 'Edit Bus pass' });
  expect(row).toHaveTextContent('Bus pass');
  expect(row).toHaveTextContent('#transport');
  expect(row).toHaveTextContent('$25.00');
  expect(row).not.toHaveTextContent('fixed');
});

it('falls back to the category name and labels fixed entries', () => {
  render(<ExpenseRows expenses={[{ ...expense, description: '', fixed: true }]} onEdit={vi.fn()} />);
  const row = screen.getByRole('button', { name: 'Edit Transportation expense' });
  expect(row).toHaveTextContent('Transportation');
  expect(row).toHaveTextContent('#transport · fixed');
});

it('passes the selected expense to the editor', () => {
  const onEdit = vi.fn();
  render(<ExpenseRows expenses={[expense]} onEdit={onEdit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Bus pass' }));
  expect(onEdit).toHaveBeenCalledWith(expense);
});

it('renders no editable rows for an empty day', () => {
  render(<ExpenseRows expenses={[]} onEdit={vi.fn()} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
