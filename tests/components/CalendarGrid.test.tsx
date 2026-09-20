import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CalendarGrid } from '../../src/components/CalendarGrid';
import type { Expense } from '../../src/domain/types';

const expense = (date: string, amountMinor: number, extra: Partial<Expense> = {}): Expense => ({
  id: date,
  date,
  amountMinor,
  category: 'Food',
  createdAt: 1,
  ...extra,
});
const setup = (overrides: Partial<Parameters<typeof CalendarGrid>[0]> = {}) => {
  const props = {
    month: '2026-09',
    today: '2026-09-20',
    selected: '2026-09-20',
    expenses: [] as Expense[],
    onSelect: vi.fn(),
    week: false,
    ...overrides,
  };
  return { props, ...render(<CalendarGrid {...props} />) };
};

it('renders selectable month dates and inert neighboring dates in complete weeks', () => {
  const { props, container } = setup();
  expect(screen.getAllByRole('button')).toHaveLength(30);
  expect(screen.getByLabelText('Aug 31, 2026').tagName).toBe('SPAN');
  expect(screen.getByLabelText('Oct 4, 2026').tagName).toBe('SPAN');
  expect(container.querySelectorAll('.calendar-pad')).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: 'September 15, 2026, $0.00' }));
  expect(props.onSelect).toHaveBeenCalledWith('2026-09-15');
});

it('marks today independently from the selected day and distinguishes future empty dates', () => {
  setup({ selected: '2026-09-15' });
  const today = screen.getByRole('button', { name: 'September 20, 2026, $0.00' });
  const selected = screen.getByRole('button', { name: 'September 15, 2026, $0.00' });
  const future = screen.getByRole('button', { name: 'September 21, 2026, $0.00' });
  expect(today).toHaveAttribute('aria-current', 'date');
  expect(today).toHaveAttribute('aria-pressed', 'false');
  expect(today).toHaveTextContent('TODAY');
  expect(selected).toHaveAttribute('aria-pressed', 'true');
  expect(selected).not.toHaveAttribute('aria-current');
  expect(selected).toHaveTextContent('—');
  expect(future).toHaveClass('future-day');
  expect(future).not.toHaveTextContent('—');
});

it('shades only flexible spending while including fixed costs in day and week totals', () => {
  const { container } = setup({
    expenses: [
      expense('2026-09-20', 1500),
      expense('2026-09-20', 1000, { id: 'rent', fixed: true, category: 'Housing' }),
      expense('2026-09-18', 500),
    ],
  });
  const day = screen.getByRole('button', { name: 'September 20, 2026, $25.00' });
  expect(day).toHaveClass('shade-2', 'fixed-day');
  expect(day).toHaveTextContent('FIXED');
  expect(day).not.toHaveTextContent('TODAY');
  expect(within(day).getByText('$15.00')).toBeInTheDocument();
  expect(within(day).getByText('15')).toBeInTheDocument();
  expect(day.querySelectorAll('.day-dots i')).toHaveLength(2);
  const totals = Array.from(container.querySelectorAll('.calendar-grid > .week-total'));
  expect(totals[2]).toHaveTextContent('$30.00total');
  expect(totals[0]).toHaveTextContent('—total');
  expect(totals[3]).toHaveTextContent('—ahead');
});

it('shows planned future expenses with fixed markers and flexible amounts', () => {
  setup({ expenses: [expense('2026-09-25', 1000, { fixed: true }), expense('2026-09-26', 3500)] });
  const fixed = screen.getByRole('button', { name: 'September 25, 2026, $10.00' });
  const flexible = screen.getByRole('button', { name: 'September 26, 2026, $35.00' });
  expect(fixed).toHaveClass('fixed-day', 'shade-0');
  expect(fixed).not.toHaveClass('future-day');
  expect(fixed).toHaveTextContent('FIXED');
  expect(fixed).not.toHaveTextContent('—');
  expect(flexible).toHaveClass('shade-3');
  expect(flexible).not.toHaveClass('future-day');
  expect(within(flexible).getByText('$35.00')).toBeInTheDocument();
});

it('limits category indicators to four distinct categories per date', () => {
  setup({
    expenses: [
      expense('2026-09-10', 100),
      expense('2026-09-10', 200, { category: 'Food' }),
      expense('2026-09-10', 100, { category: 'Housing' }),
      expense('2026-09-10', 100, { category: 'Fun' }),
      expense('2026-09-10', 100, { category: 'Study' }),
      expense('2026-09-10', 100, { category: 'Health' }),
    ],
  });
  const day = screen.getByRole('button', { name: 'September 10, 2026, $7.00' });
  expect(day.querySelectorAll('.day-dots i')).toHaveLength(4);
});

it('shows only the selected Monday-to-Sunday week and its date labels', () => {
  const { container } = setup({ week: true, selected: '2026-09-15' });
  expect(screen.getAllByRole('button')).toHaveLength(7);
  expect(screen.getByRole('button', { name: 'September 14, 2026, $0.00' })).toHaveTextContent(
    'MON · SEP 14',
  );
  expect(screen.getByRole('button', { name: 'September 20, 2026, $0.00' })).toHaveTextContent(
    'SUN · SEP 20',
  );
  expect(
    screen.queryByRole('button', { name: 'September 21, 2026, $0.00' }),
  ).not.toBeInTheDocument();
  expect(container.querySelector('.calendar-grid-wrap')).toHaveClass('week-view');
});

it('includes the adjacent month when the selected week crosses a month boundary', () => {
  setup({ week: true, selected: '2026-09-01' });
  expect(screen.getAllByRole('button')).toHaveLength(7);
  expect(screen.getByRole('button', { name: 'August 31, 2026, $0.00' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'September 6, 2026, $0.00' })).toBeInTheDocument();
});

it('renders inert blank padding beyond the maximum calendar year', () => {
  const { container, rerender } = setup({ month: '9999-12', selected: '9999-12-31' });
  expect(screen.getAllByRole('button')).toHaveLength(31);
  const padding = container.querySelectorAll('.calendar-pad');
  expect(padding).toHaveLength(4);
  expect(padding[2]).toBeEmptyDOMElement();
  expect(padding[2]).not.toHaveAttribute('aria-label');
  expect(padding[3]).toBeEmptyDOMElement();
  expect(screen.getByRole('button', { name: 'December 31, 9999, $0.00' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  rerender(
    <CalendarGrid
      month="9999-12"
      selected="9999-12-31"
      today="9999-12-31"
      expenses={[]}
      onSelect={vi.fn()}
      week
    />,
  );
  expect(screen.getAllByRole('button')).toHaveLength(5);
  expect(container.querySelectorAll('.calendar-pad')).toHaveLength(2);
});

it('renders the first supported year without shifting it into the twentieth century', () => {
  setup({ month: '0001-01', selected: '0001-01-01', today: '0001-01-01' });
  expect(screen.getByRole('button', { name: 'January 1, 1, $0.00' })).toHaveAttribute(
    'aria-current',
    'date',
  );
});
