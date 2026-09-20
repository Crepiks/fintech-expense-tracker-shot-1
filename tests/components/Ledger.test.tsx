import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ExpenseList } from '../../src/components/ExpenseList';
import { Totals } from '../../src/components/Totals';
import { MonthSwitcher } from '../../src/components/MonthSwitcher';
import { computeTotals } from '../../src/domain/calc';
import { expense } from '../fixtures';

it('shows the empty month and zero totals', () => {
  render(
    <>
      <ExpenseList expenses={[]} month="2026-09" onDelete={vi.fn()} />
      <Totals filter={null} onFilter={vi.fn()} totals={computeTotals([])} count={0} />
    </>,
  );
  expect(screen.getByText('No expenses in September 2026 yet.')).toBeInTheDocument();
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('USD 0');
  expect(screen.getByText('Categories = Total')).toBeInTheDocument();
  expect(screen.getByText('0 expenses')).toBeInTheDocument();
});
it('renders amounts and descriptions and deletes the selected record', () => {
  const onDelete = vi.fn();
  render(
    <ExpenseList
      expenses={[expense, { ...expense, id: 'two', description: 'Groceries' }]}
      month="2026-09"
      onDelete={onDelete}
    />,
  );
  expect(screen.getByText('No description')).toBeInTheDocument();
  expect(screen.getByText('Groceries')).toBeInTheDocument();
  expect(screen.getAllByText('Sep 1, 2026')).toHaveLength(2);
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete expense' })[1]);
  expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'two' }));
});
it('shows exact total and rounded category percentages', () => {
  render(<Totals filter={null} onFilter={vi.fn()} totals={computeTotals([expense])} count={1} />);
  expect(screen.getByText('1 expense')).toBeInTheDocument();
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('USD 1,500');
  expect(within(screen.getByLabelText('Category totals')).getByText('100%')).toBeInTheDocument();
});
it('renders an invariant failure visibly', () => {
  render(
    <Totals
      filter={null}
      onFilter={vi.fn()}
      totals={{ ...computeTotals([]), invariantOk: false }}
      count={0}
    />,
  );
  expect(screen.getByText('Totals need attention')).toBeInTheDocument();
});
it('navigates months using named buttons', () => {
  const onChange = vi.fn();
  const { rerender } = render(<MonthSwitcher month="2026-01" onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(onChange).toHaveBeenLastCalledWith('2025-12');
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(onChange).toHaveBeenLastCalledWith('2026-02');
  rerender(<MonthSwitcher month="0001-01" onChange={onChange} />);
  expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  rerender(<MonthSwitcher month="9999-12" onChange={onChange} />);
  expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
});

it('explains when a standalone filtered list is empty', () => {
  render(
    <ExpenseList expenses={[expense]} month="2026-09" categoryFilter="Health" onDelete={vi.fn()} />,
  );
  expect(screen.getByText('No Health expenses in September 2026.')).toBeInTheDocument();
});
