import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LedgerPage } from '../../src/components/LedgerPage';
import type { Expense } from '../../src/domain/types';

const expenses: Expense[] = [
  {
    id: 'lunch',
    date: '2026-09-20',
    description: 'Lunch',
    category: 'Food',
    amountMinor: 1250,
    createdAt: 5,
  },
  {
    id: 'cinema',
    date: '2026-09-20',
    description: 'Cinema',
    category: 'Fun',
    amountMinor: 3000,
    createdAt: 4,
  },
  {
    id: 'bus',
    date: '2026-09-19',
    description: 'Bus pass',
    category: 'Transportation',
    amountMinor: 5000,
    createdAt: 3,
  },
  {
    id: 'snack',
    date: '2026-09-19',
    description: '',
    category: 'Food',
    amountMinor: 500,
    createdAt: 2,
  },
  {
    id: 'rent',
    date: '2026-09-18',
    description: 'Rent',
    category: 'Housing',
    amountMinor: 80000,
    fixed: true,
    createdAt: 1,
  },
];
const makeProps = () => ({
  expenses,
  month: '2026-09',
  today: '2026-09-20',
  budget: 100000,
  query: '',
  onQuery: vi.fn(),
  onMonth: vi.fn(),
  onEdit: vi.fn(),
  onImport: vi.fn(),
  onExport: vi.fn(),
});

function stat(label: string): HTMLElement {
  return screen.getByText(label, { selector: '.ledger-stats .eyebrow' }).parentElement!;
}

it('shows totals, fixed costs, a rounded variable average, and the largest variable entry', () => {
  render(<LedgerPage {...makeProps()} />);
  expect(stat('ENTRIES')).toHaveTextContent('5');
  expect(stat('ENTRIES')).toHaveTextContent('all categories · 2026-09');
  expect(stat('TOTAL')).toHaveTextContent('$897.50');
  expect(stat('TOTAL')).toHaveTextContent('incl. $800.00 fixed');
  expect(stat('AVG / ENTRY')).toHaveTextContent('$24.38');
  expect(stat('LARGEST')).toHaveTextContent('$50.00');
  expect(stat('LARGEST')).toHaveTextContent('Bus pass');
});

it('groups entries by day and marks only today', () => {
  render(<LedgerPage {...makeProps()} />);
  const today = screen.getByRole('region', { name: 'SUN · SEP 20' });
  const yesterday = screen.getByRole('region', { name: 'SAT · SEP 19' });
  expect(today).toHaveTextContent('SUN · SEP 20 · TODAY');
  expect(today).toHaveTextContent('$42.50');
  expect(yesterday).toHaveTextContent('$55.00');
  expect(yesterday).not.toHaveTextContent('TODAY');
  expect(within(today).getAllByRole('button', { name: 'Edit Lunch' })).toHaveLength(2);
  expect(within(yesterday).getAllByRole('button', { name: 'Edit Food expense' })).toHaveLength(2);
});

it('toggles a category and resets it with the all chip', () => {
  render(<LedgerPage {...makeProps()} />);
  const food = screen.getByRole('button', { name: 'Filter Food' });
  const all = screen.getByRole('button', { name: 'Clear filter' });
  expect(all).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(food);
  expect(food).toHaveAttribute('aria-pressed', 'true');
  expect(all).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('2 entries')).toBeInTheDocument();
  expect(stat('ENTRIES')).toHaveTextContent('#food · 2026-09');
  expect(stat('TOTAL')).toHaveTextContent('$17.50');
  expect(stat('LARGEST')).toHaveTextContent('Lunch');
  expect(screen.queryByRole('button', { name: 'Edit Bus pass' })).not.toBeInTheDocument();
  fireEvent.click(food);
  expect(screen.getByText('5 entries')).toBeInTheDocument();
  fireEvent.click(food);
  fireEvent.click(all);
  expect(screen.getByText('5 entries')).toBeInTheDocument();
  expect(food).toHaveAttribute('aria-pressed', 'false');
});

it('clears the category when its last entry disappears and keeps all selected after undo', () => {
  const props = makeProps();
  const { rerender } = render(<LedgerPage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Filter Fun' }));
  expect(screen.getByText('1 entries')).toBeInTheDocument();
  rerender(<LedgerPage {...props} expenses={expenses.filter((item) => item.id !== 'cinema')} />);
  expect(screen.getByRole('button', { name: 'Clear filter' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByText('4 entries')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Edit Lunch' })).toHaveLength(2);
  rerender(<LedgerPage {...props} />);
  expect(screen.getByRole('button', { name: 'Clear filter' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByText('5 entries')).toBeInTheDocument();
});

it('keeps a category selected while another matching entry remains', () => {
  const props = makeProps();
  const { rerender } = render(<LedgerPage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Filter Food' }));
  rerender(<LedgerPage {...props} expenses={expenses.filter((item) => item.id !== 'lunch')} />);
  expect(screen.getByRole('button', { name: 'Filter Food' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByText('1 entries')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Edit Food expense' })).toHaveLength(2);
});

it('preserves an intentionally empty category when unrelated expenses change', () => {
  const props = makeProps();
  const { rerender } = render(<LedgerPage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Filter Study' }));
  expect(screen.getByRole('heading', { name: 'No matching expenses.' })).toBeInTheDocument();
  rerender(<LedgerPage {...props} expenses={expenses.filter((item) => item.id !== 'cinema')} />);
  expect(screen.getByRole('button', { name: 'Filter Study' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('heading', { name: 'No matching expenses.' })).toBeInTheDocument();
});

it('preserves the selected category when only the search stops matching', () => {
  const props = makeProps();
  const { rerender } = render(<LedgerPage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Filter Food' }));
  rerender(<LedgerPage {...props} query="not in any note" />);
  expect(screen.getByRole('button', { name: 'Filter Food' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('heading', { name: 'No matching expenses.' })).toBeInTheDocument();
});

it('forwards search changes and combines the controlled query with the selected category', () => {
  const props = makeProps();
  const { rerender } = render(<LedgerPage {...props} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Filter expenses' }), {
    target: { value: '>20' },
  });
  expect(props.onQuery).toHaveBeenCalledWith('>20');
  rerender(<LedgerPage {...props} query=">20" />);
  expect(screen.getByRole('textbox', { name: 'Filter expenses' })).toHaveValue('>20');
  expect(screen.getByText('3 entries')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Filter Fun' }));
  expect(screen.getByText('1 entries')).toBeInTheDocument();
  expect(stat('TOTAL')).toHaveTextContent('$30.00');
});

it('keeps the complete chronological budget balance when entries are filtered out', () => {
  render(<LedgerPage {...makeProps()} query="#food" />);
  const lunch = screen.getAllByRole('button', { name: 'Edit Lunch' })[1];
  const snack = screen.getAllByRole('button', { name: 'Edit Food expense' })[1];
  expect(lunch).toHaveTextContent('$102.50');
  expect(snack).toHaveTextContent('$195.00');
  expect(screen.queryByRole('button', { name: 'Edit Rent' })).not.toBeInTheDocument();
});

it('shows an unset balance instead of an invented budget', () => {
  render(<LedgerPage {...makeProps()} budget={null} />);
  const lunch = screen.getAllByRole('button', { name: 'Edit Lunch' })[1];
  expect(lunch).toHaveTextContent('—');
});

it('opens either the mobile or desktop entry for editing', () => {
  const props = makeProps();
  render(<LedgerPage {...props} />);
  screen
    .getAllByRole('button', { name: 'Edit Lunch' })
    .forEach((button) => fireEvent.click(button));
  expect(props.onEdit).toHaveBeenCalledTimes(2);
  expect(props.onEdit).toHaveBeenNthCalledWith(1, expenses[0]);
  expect(props.onEdit).toHaveBeenNthCalledWith(2, expenses[0]);
});

it('labels fixed entries and excludes them from average and largest calculations', () => {
  render(<LedgerPage {...makeProps()} expenses={[expenses[4]]} />);
  expect(stat('AVG / ENTRY')).toHaveTextContent('$0.00');
  expect(stat('LARGEST')).toHaveTextContent('—');
  expect(stat('LARGEST')).toHaveTextContent('excl. fixed costs');
  screen.getAllByRole('button', { name: 'Edit Rent' }).forEach((button) => {
    expect(button).toHaveTextContent('#housing · fixed');
  });
});

it('falls back to the category label for entries with no description', () => {
  render(<LedgerPage {...makeProps()} expenses={[expenses[3]]} />);
  screen.getAllByRole('button', { name: 'Edit Food expense' }).forEach((button) => {
    expect(button).toHaveTextContent('Food');
    expect(button).toHaveTextContent('$5.00');
  });
  expect(stat('LARGEST')).toHaveTextContent('$5.00');
  expect(stat('LARGEST')).toHaveTextContent('excl. fixed costs');
});

it('shows guidance when the current month is empty', () => {
  render(<LedgerPage {...makeProps()} expenses={[]} />);
  expect(
    screen.getByRole('heading', { name: 'No expenses in September 2026 yet.' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Tap + and type your first expense like a note.')).toBeInTheDocument();
  expect(stat('TOTAL')).toHaveTextContent('$0.00');
});

it('shows filter guidance when existing expenses do not match', () => {
  render(<LedgerPage {...makeProps()} query="unknown note" />);
  expect(screen.getByRole('heading', { name: 'No matching expenses.' })).toBeInTheDocument();
  expect(screen.getByText('Try another category or search.')).toBeInTheDocument();
});

it('forwards import, export, and month navigation actions', () => {
  const props = makeProps();
  render(<LedgerPage {...props} />);
  screen
    .getAllByRole('button', { name: 'import csv' })
    .forEach((button) => fireEvent.click(button));
  screen
    .getAllByRole('button', { name: 'export csv' })
    .forEach((button) => fireEvent.click(button));
  expect(props.onImport).toHaveBeenCalledTimes(2);
  expect(props.onExport).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(props.onMonth).toHaveBeenNthCalledWith(1, '2026-08');
  expect(props.onMonth).toHaveBeenNthCalledWith(2, '2026-10');
});
