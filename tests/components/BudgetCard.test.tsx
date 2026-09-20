import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { BudgetCard } from '../../src/components/BudgetCard';

const base = { spentMinor: 300000, month: '2026-09', today: '2026-09-19', onSave: vi.fn(), stipendDay: null, onStipendSave: vi.fn() };
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
  fireEvent.click(screen.getByRole('button', { name: 'Edit budget settings' }));
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
  expect(screen.queryByText(/Safe to spend today/)).not.toBeInTheDocument();
});

it('reserves pending costs for daily guidance while showing the full recorded balance', () => {
  render(<BudgetCard {...base} today="2026-09-20" spentMinor={0} budgetMinor={61000} reservedMinor={50000} />);
  expect(screen.getByLabelText('Budget remaining')).toHaveTextContent('USD 610');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByText('Safe to spend today: USD 10')).toBeInTheDocument();
});

it('hides spendable guidance when pending costs exceed the remaining budget', () => {
  render(<BudgetCard {...base} today="2026-09-20" spentMinor={0} budgetMinor={40000} reservedMinor={50000} />);
  expect(screen.getByLabelText('Budget remaining')).toHaveTextContent('USD 400');
  expect(screen.queryByText(/Safe to spend today/)).not.toBeInTheDocument();
});
it('omits current-day guidance for historical months and accepts synced budgets', () => {
  const { rerender } = render(<BudgetCard {...base} month="2026-08" budgetMinor={500000} />);
  expect(screen.queryByText(/Safe to spend today/)).not.toBeInTheDocument();
  rerender(<BudgetCard {...base} month="2026-08" budgetMinor={600000} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit budget settings' }));
  expect(screen.getByLabelText('Monthly budget (USD)')).toHaveValue('6,000');
  expect(screen.getByLabelText('Budget amount')).toHaveTextContent('USD 6,000');
  rerender(<BudgetCard {...base} budgetMinor={null} />);
  expect(screen.getByLabelText('Monthly budget (USD)')).toHaveValue('');
});

it.each([['0', false], ['32', false], ['1.5', false], ['31', true], ['', true]])('validates stipend input %s before saving settings', (input, valid) => {
  const onSave = vi.fn();
  const onStipendSave = vi.fn();
  render(<BudgetCard {...base} budgetMinor={null} onSave={onSave} onStipendSave={onStipendSave} />);
  fireEvent.change(screen.getByLabelText('Stipend day (optional)'), { target: { value: input } });
  fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
  if (valid) {
    expect(onStipendSave).toHaveBeenCalledWith(input === '' ? null : 31);
  } else {
    expect(screen.getByText('Choose a whole day from 1 to 31, or leave empty.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onStipendSave).not.toHaveBeenCalled();
  }
});
it('shows today or a countdown independently of the month being viewed', () => {
  const { rerender } = render(<BudgetCard {...base} budgetMinor={null} stipendDay={19} />);
  expect(screen.getByText('Stipend day is today')).toBeInTheDocument();
  rerender(<BudgetCard {...base} budgetMinor={null} month="2026-08" stipendDay={1} />);
  expect(screen.getByText('Stipend in 12 days (Oct 1, 2026)')).toBeInTheDocument();
});
it.each([[80000, '80% used'], [100000, '100% used'], [120000, '120% used']])('prints actual percentage at spending %i', (spentMinor, label) => {
  render(<BudgetCard {...base} budgetMinor={100000} spentMinor={spentMinor} />);
  expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', spentMinor === 80000 ? '80' : '100');
});
