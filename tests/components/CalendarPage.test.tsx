import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CalendarPage } from '../../src/components/CalendarPage';
import type { Expense, StoredData } from '../../src/domain/types';

const expense = (date: string, amountMinor: number, extra: Partial<Expense> = {}): Expense => ({
  id: date, date, amountMinor, category: 'Food', createdAt: 1, ...extra,
});
const setup = (overrides: Partial<Parameters<typeof CalendarPage>[0]> = {}) => {
  const props = {
    month: '2026-09', today: '2026-09-20', selected: '2026-09-20', allExpenses: [] as Expense[],
    settings: { monthlyBudgetMinor: null, stipendDay: null } as StoredData['settings'],
    onSelect: vi.fn(), onMonth: vi.fn(), onAdd: vi.fn(), onBudget: vi.fn(), onEdit: vi.fn(), ...overrides,
  };
  return { props, ...render(<CalendarPage {...props} />) };
};

it('shows an empty current day with an unset budget and allows adding to that date', () => {
  const { props } = setup();
  const selected = screen.getByRole('region', { name: 'Selected day' });
  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
  expect(screen.getByText('DAY 20/30 · 0 ENTRIES')).toBeInTheDocument();
  expect(screen.getByText('No monthly limit')).toBeInTheDocument();
  expect(screen.getByText('Set a budget')).toBeInTheDocument();
  expect(selected).toHaveTextContent('SUN · SEP 20 · TODAY');
  expect(selected).toHaveTextContent('// no expenses on this day.');
  fireEvent.click(within(selected).getByRole('button', { name: /add to this day/ }));
  expect(props.onAdd).toHaveBeenCalledWith('2026-09-20');
  fireEvent.click(screen.getByRole('button', { name: 'budget →' }));
  expect(props.onBudget).toHaveBeenCalledOnce();
});

it('shows a future empty date as unplanned without a today marker', () => {
  setup({ selected: '2026-09-25' });
  const selected = screen.getByRole('region', { name: 'Selected day' });
  expect(selected).toHaveTextContent('FRI · SEP 25');
  expect(selected).not.toHaveTextContent('TODAY');
  expect(selected).toHaveTextContent('// nothing planned for this day.');
});

it('shows recorded spending, the budget allowance and positive daily difference', () => {
  const entry = expense('2026-09-20', 4000, { description: 'Lunch' });
  const { props } = setup({
    allExpenses: [entry, expense('2026-08-20', 9000)],
    settings: { monthlyBudgetMinor: 15000, stipendDay: null, categoryLimits: { Food: 5000 } },
  });
  expect(screen.getByLabelText('Total spent')).toHaveTextContent('$40.00');
  expect(screen.getByText('27% of $150.00')).toBeInTheDocument();
  expect(screen.getByText('$10.00/day')).toBeInTheDocument();
  const selected = screen.getByRole('region', { name: 'Selected day' });
  expect(selected).toHaveTextContent('+$38.00 vs avg');
  expect(selected).not.toHaveTextContent('no expenses');
  expect(screen.getByText('/ $50')).toBeInTheDocument();
  fireEvent.click(within(selected).getByRole('button', { name: 'Edit Lunch' }));
  expect(props.onEdit).toHaveBeenCalledWith(entry);
});

it('compares a fixed-only day against the flexible spending average', () => {
  setup({ allExpenses: [expense('2026-09-01', 4000), expense('2026-09-20', 50000, { fixed: true })] });
  const selected = screen.getByRole('region', { name: 'Selected day' });
  expect(selected).toHaveTextContent('−$2.00 vs avg');
  expect(selected).toHaveTextContent('fixed');
  expect(within(selected).getByRole('heading')).toHaveTextContent('$500.00');
});

it('shows a zero daily difference without a negative sign', () => {
  setup({ allExpenses: [expense('2026-09-20', 50000, { fixed: true })] });
  expect(screen.getByRole('region', { name: 'Selected day' })).toHaveTextContent('+$0.00 vs avg');
});

it('navigates both months and forwards a selected calendar date', () => {
  const { props } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(props.onMonth).toHaveBeenLastCalledWith('2026-08');
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(props.onMonth).toHaveBeenLastCalledWith('2026-10');
  fireEvent.click(screen.getByRole('button', { name: 'September 7, 2026, $0.00' }));
  expect(props.onSelect).toHaveBeenCalledWith('2026-09-07');
});

it('switches to the selected week, then the year, and returns to month after choosing one', () => {
  const { props } = setup({ allExpenses: [expense('2026-02-05', 1200)] });
  fireEvent.click(screen.getByRole('button', { name: 'week' }));
  expect(screen.getByRole('button', { name: 'week' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByRole('button', { name: /September \d+, 2026/ })).toHaveLength(7);
  expect(screen.getByText('MON · SEP 14')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'year' }));
  expect(screen.getByRole('button', { name: 'year' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: /September 20, 2026/ })).not.toBeInTheDocument();
  const february = screen.getByRole('button', { name: /^February/ });
  expect(february).toHaveTextContent('$12.00');
  expect(february).toHaveTextContent('1 entries · 28 days');
  fireEvent.click(february);
  expect(props.onMonth).toHaveBeenCalledWith('2026-02');
  expect(screen.getByRole('button', { name: 'month' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByRole('button', { name: /September \d+, 2026/ })).toHaveLength(30);
});

it.each([
  ['0001-01', '0001-01-01', 'Previous month', 'Next month'],
  ['9999-12', '9999-12-31', 'Next month', 'Previous month'],
])('disables navigation beyond the supported month %s', (month, selected, disabled, enabled) => {
  const { props } = setup({ month, selected });
  expect(screen.getByRole('button', { name: disabled })).toBeDisabled();
  expect(screen.getByRole('button', { name: enabled })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: disabled }));
  expect(props.onMonth).not.toHaveBeenCalled();
});

it('shows historical remaining budget without a current-day allowance', () => {
  setup({ month: '2026-08', selected: '2026-08-01', settings: { monthlyBudgetMinor: 10000, stipendDay: null } });
  expect(screen.getByText('0% of $100.00')).toBeInTheDocument();
  expect(screen.getByText('Current month only')).toBeInTheDocument();
  expect(screen.queryByText('Set a budget')).not.toBeInTheDocument();
  expect(screen.getByText('DAY 31/31 · 0 ENTRIES')).toBeInTheDocument();
});

it('navigates by seven days in week view, crossing months when necessary', () => {
  const { props, rerender } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'week' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  expect(props.onSelect).toHaveBeenLastCalledWith('2026-09-27');
  expect(props.onMonth).not.toHaveBeenCalled();
  rerender(<CalendarPage {...props} selected="2026-09-27" />);
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  expect(props.onMonth).toHaveBeenLastCalledWith('2026-10');
  expect(props.onSelect).toHaveBeenLastCalledWith('2026-10-04');
  fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
  expect(props.onSelect).toHaveBeenLastCalledWith('2026-09-20');
});
it('moves year view directly between years and displays its year', () => {
  const { props, rerender } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'year' }));
  expect(screen.getByRole('heading', { name: '2026' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next year' }));
  expect(props.onMonth).toHaveBeenLastCalledWith('2027-09');
  fireEvent.click(screen.getByRole('button', { name: 'Previous year' }));
  expect(props.onMonth).toHaveBeenLastCalledWith('2025-09');
  rerender(<CalendarPage {...props} month="0001-09" selected="0001-09-20" />);
  expect(screen.getByRole('button', { name: 'Previous year' })).toBeDisabled();
  rerender(<CalendarPage {...props} month="9999-09" selected="9999-09-20" />);
  expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
});
it('disables week navigation at the supported day bounds', () => {
  const { props, rerender } = setup({ month: '0001-01', selected: '0001-01-01' });
  fireEvent.click(screen.getByRole('button', { name: 'week' }));
  expect(screen.getByRole('button', { name: 'Previous week' })).toBeDisabled();
  rerender(<CalendarPage {...props} month="9999-12" selected="9999-12-31" />);
  expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
});

it('includes and selects adjacent-month dates in a complete week', () => {
  const { props } = setup({
    month: '2026-10', selected: '2026-10-04',
    allExpenses: [expense('2026-09-30', 1000), expense('2026-10-01', 2000)],
  });
  fireEvent.click(screen.getByRole('button', { name: 'week' }));
  expect(screen.getByText('$30.00')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'September 30, 2026, $10.00' }));
  expect(props.onMonth).toHaveBeenCalledWith('2026-09');
  expect(props.onSelect).toHaveBeenCalledWith('2026-09-30');
});
