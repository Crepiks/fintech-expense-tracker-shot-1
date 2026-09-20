import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { BudgetCard } from '../../src/components/BudgetCard';

const base = { spentMinor: 300000, month: '2026-09', today: '2026-09-19', onSave: vi.fn() };
it('invites a budget and saves exact parsed values', () => {
  const onSave = vi.fn();
  render(<BudgetCard {...base} budgetMinor={null} onSave={onSave} />);
  expect(screen.getByText('Give your spending a little direction.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Monthly budget (USD)'), { target: { value: '5,000.50' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
  expect(onSave).toHaveBeenCalledWith(500050);
  expect(screen.getByRole('status')).toHaveTextContent('Budget saved.');
});
it('rejects invalid budgets with an accessible error', () => {
  const onSave = vi.fn();
  render(<BudgetCard {...base} budgetMinor={null} onSave={onSave} />);
  fireEvent.change(screen.getByLabelText('Monthly budget (USD)'), { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
  expect(screen.getByText('Amount must be greater than 0.')).toBeInTheDocument();
  expect(screen.getByLabelText('Monthly budget (USD)')).toHaveAttribute('aria-invalid', 'true');
  expect(onSave).not.toHaveBeenCalled();
});
it('clears the budget when the input is empty', () => {
  const onSave = vi.fn();
  render(<BudgetCard {...base} budgetMinor={500000} onSave={onSave} />);
  fireEvent.change(screen.getByLabelText('Monthly budget (USD)'), { target: { value: ' ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
  expect(onSave).toHaveBeenCalledWith(null);
  expect(screen.getByRole('status')).toHaveTextContent('Budget cleared.');
});
it('shows budget, spent, remaining, progress, and current daily allowance', () => {
  render(<BudgetCard {...base} budgetMinor={500000} />);
  expect(screen.getByLabelText('Budget amount')).toHaveTextContent('USD 5,000');
  expect(screen.getByLabelText('Budget spent')).toHaveTextContent('USD 3,000');
  expect(screen.getByLabelText('Budget remaining')).toHaveTextContent('USD 2,000');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
  expect(screen.getByText('Safe to spend today: USD 166.66')).toBeInTheDocument();
  expect(screen.getByText('Across 12 days, including today.')).toBeInTheDocument();
});
it('clearly shows overspending instead of a negative daily allowance', () => {
  render(<BudgetCard {...base} budgetMinor={200000} />);
  expect(screen.getByText('Over by USD 1,000')).toBeInTheDocument();
  expect(screen.getByText('Safe to spend today: USD 0')).toBeInTheDocument();
});
it('omits current-day guidance for historical months and accepts synced budgets', () => {
  const { rerender } = render(<BudgetCard {...base} month="2026-08" budgetMinor={500000} />);
  expect(screen.queryByText(/Safe to spend today/)).not.toBeInTheDocument();
  rerender(<BudgetCard {...base} month="2026-08" budgetMinor={600000} />);
  expect(screen.getByLabelText('Monthly budget (USD)')).toHaveValue('6,000');
  expect(screen.getByLabelText('Budget amount')).toHaveTextContent('USD 6,000');
  rerender(<BudgetCard {...base} budgetMinor={null} />);
  expect(screen.getByLabelText('Monthly budget (USD)')).toHaveValue('');
});
