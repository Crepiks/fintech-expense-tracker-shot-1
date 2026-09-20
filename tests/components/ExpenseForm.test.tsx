import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { ExpenseForm } from '../../src/components/ExpenseForm';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 19, 12));
});
afterEach(() => vi.useRealTimers());
const setup = (canAdd = true) => {
  const onAdd = vi.fn();
  const onMonthChange = vi.fn();
  render(
    <ExpenseForm
      selectedMonth="2026-09"
      onAdd={onAdd}
      onMonthChange={onMonthChange}
      canAdd={canAdd}
    />,
  );
  return { onAdd, onMonthChange, user: userEvent.setup() };
};
it('explains invalid fields and focuses the first invalid input', async () => {
  const { user, onAdd } = setup();
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });
  await user.click(screen.getByRole('button', { name: 'Add an expense' }));
  expect(screen.getByText('Enter an amount.')).toBeInTheDocument();
  expect(screen.getByText('Choose a category.')).toBeInTheDocument();
  expect(screen.getByText('Pick a date.')).toBeInTheDocument();
  expect(screen.getByLabelText('Amount (USD)')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Amount (USD)')).toHaveFocus();
  expect(onAdd).not.toHaveBeenCalled();
});
it('submits normalized values and resets only amount and description', async () => {
  const { user, onAdd } = setup();
  await user.type(screen.getByLabelText('Amount (USD)'), '1,500');
  await user.selectOptions(screen.getByLabelText('Category'), 'Food');
  await user.type(screen.getByLabelText('Description (optional)'), '  Groceries  ');
  await user.click(screen.getByRole('button', { name: 'Add an expense' }));
  expect(onAdd).toHaveBeenCalledWith({
    amountMinor: 150000,
    category: 'Food',
    date: '2026-09-19',
    description: 'Groceries',
  });
  expect(screen.getByLabelText('Amount (USD)')).toHaveValue('');
  expect(screen.getByLabelText('Description (optional)')).toHaveValue('');
  expect(screen.getByLabelText('Category')).toHaveValue('Food');
  expect(screen.getByLabelText('Date')).toHaveValue('2026-09-19');
  expect(screen.getByLabelText('Amount (USD)')).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('Expense added.');
});
it('warns about future dates and offers a link to another month', async () => {
  const { user, onMonthChange } = setup();
  await user.type(screen.getByLabelText('Amount (USD)'), '5');
  await user.selectOptions(screen.getByLabelText('Category'), 'Food');
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-01' } });
  expect(screen.getByText('This date is in the future.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add an expense' }));
  expect(screen.getByRole('status')).toHaveTextContent('Saved to October 2026');
  await user.click(screen.getByRole('button', { name: 'View October 2026' }));
  expect(onMonthChange).toHaveBeenCalledWith('2026-10');
});
it('blocks additions at the record limit with an explanation', () => {
  const { onAdd } = setup(false);
  expect(screen.getByRole('button', { name: 'Add an expense' })).toBeDisabled();
  fireEvent.submit(screen.getByRole('form', { name: 'Add an expense' }));
  expect(screen.getByText(/10,000 expenses/)).toBeInTheDocument();
  expect(onAdd).not.toHaveBeenCalled();
});
it('moves focus to category then date when they alone are invalid', async () => {
  const { user } = setup();
  await user.type(screen.getByLabelText('Amount (USD)'), '10');
  await user.click(screen.getByRole('button', { name: 'Add an expense' }));
  expect(screen.getByLabelText('Category')).toHaveFocus();
  await user.selectOptions(screen.getByLabelText('Category'), 'Food');
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });
  await user.click(screen.getByRole('button', { name: 'Add an expense' }));
  expect(screen.getByLabelText('Date')).toHaveFocus();
});

it('starts on the selected date while comparing future warnings with today', () => {
  render(
    <ExpenseForm
      today="2026-09-20"
      initialDate="2026-10-01"
      selectedMonth="2026-10"
      onAdd={vi.fn()}
      onMonthChange={vi.fn()}
      canAdd
    />,
  );
  const date = screen.getByLabelText('Date');
  expect(date).toHaveValue('2026-10-01');
  expect(screen.getByText('This date is in the future.')).toBeInTheDocument();
  fireEvent.change(date, { target: { value: '2026-09-20' } });
  expect(screen.queryByText('This date is in the future.')).not.toBeInTheDocument();
});
