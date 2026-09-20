import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { BudgetPage } from '../../src/components/BudgetPage';
import type { Expense, StoredData } from '../../src/domain/types';
import { empty, expense } from '../fixtures';

function props() {
  return {
    month: '2026-09',
    today: '2026-09-15',
    expenses: [] as Expense[],
    settings: empty.settings,
    onBudget: vi.fn(),
    onLimit: vi.fn(),
    onRepeat: vi.fn(),
    onRemoveRepeat: vi.fn(),
    onMonth: vi.fn(),
    onSettings: vi.fn(),
  };
}

function categoryRow(tag: string) {
  return screen
    .getByText(`#${tag}`, { selector: '.category-name' })
    .closest('.category-budget') as HTMLElement;
}

function detail(label: string) {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling;
}

it('invites an empty budget and displays no-limit statuses and unavailable guidance', () => {
  render(<BudgetPage {...props()} />);
  expect(screen.getByRole('heading', { name: 'Budget' })).toBeInTheDocument();
  expect(screen.getByText(/SET YOUR MONTHLY LIMIT/)).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Monthly limit' })).toHaveValue('');
  expect(screen.getAllByText('NO LIMIT')).toHaveLength(7);
  expect(screen.getByText(/set a monthly limit to plan ahead/)).toBeInTheDocument();
  expect(detail('safe to spend / day')).toHaveTextContent('—');
  expect(detail('pace line today')).toHaveTextContent('—');
  expect(detail('vs pace')).toHaveTextContent('—');
  expect(
    screen.getAllByRole('img', { name: 'Cumulative spending $0.00; month-end estimate $0.00' }),
  ).toHaveLength(2);
});

it('shows a current forecast under the limit with daily allowance and pace', () => {
  const settings = { ...empty.settings, monthlyBudgetMinor: 100000 };
  render(
    <BudgetPage {...props()} settings={settings} expenses={[{ ...expense, amountMinor: 15000 }]} />,
  );
  expect(screen.getByRole('heading', { name: 'FORECAST · SEP 30' })).toBeInTheDocument();
  expect(screen.getByText(/LIMIT \$1,000 · DAY 15\/30/)).toBeInTheDocument();
  expect(screen.getAllByText('$700.00 under')).toHaveLength(2);
  expect(detail('safe to spend / day')).toHaveTextContent('$53.12');
  expect(detail('pace line today')).toHaveTextContent('$500.00');
  expect(detail('vs pace')).toHaveTextContent('-$350.00');
});

it('compares only observed spending against todays pace while reserving future records', () => {
  render(
    <BudgetPage
      {...props()}
      settings={{ ...empty.settings, monthlyBudgetMinor: 100000 }}
      expenses={[
        { ...expense, amountMinor: 15000 },
        { ...expense, id: 'scheduled', date: '2026-09-25', amountMinor: 20000 },
      ]}
    />,
  );
  expect(detail('pace line today')).toHaveTextContent('$500.00');
  expect(detail('vs pace')).toHaveTextContent('-$350.00');
  expect(detail('safe to spend / day')).toHaveTextContent('$40.62');
});

it('shows overspending without a negative safe daily allowance', () => {
  render(
    <BudgetPage
      {...props()}
      settings={{ ...empty.settings, monthlyBudgetMinor: 10000 }}
      expenses={[{ ...expense, amountMinor: 15000 }]}
    />,
  );
  expect(screen.getAllByText('$200.00 over')).toHaveLength(2);
  expect(detail('safe to spend / day')).toHaveTextContent('$0.00');
});

it.each([
  ['2026-08', '2026-08-01', 'MONTH TOTAL · AUG 31', '$150.00'],
  ['2026-10', '2026-10-01', 'FORECAST · OCT 31', '$150.00'],
])('uses appropriate forecast guidance for %s', (month, date, heading, total) => {
  render(
    <BudgetPage
      {...props()}
      month={month}
      settings={{ ...empty.settings, monthlyBudgetMinor: 100000 }}
      expenses={[{ ...expense, date, amountMinor: 15000 }]}
    />,
  );
  expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  expect(screen.getByText(total, { selector: '.forecast-amount' })).toBeInTheDocument();
  expect(detail('safe to spend / day')).toHaveTextContent('—');
});

it('distinguishes no limit, over, paid, watch and on-track categories', () => {
  const settings: StoredData['settings'] = {
    ...empty.settings,
    monthlyBudgetMinor: 100000,
    categoryLimits: {
      Housing: 10000,
      Food: 10000,
      Transportation: 10000,
      Fun: 10000,
      Health: 10000,
    },
  };
  const expenses: Expense[] = [
    { ...expense, id: 'housing', category: 'Housing', amountMinor: 10000, fixed: true },
    { ...expense, id: 'food', category: 'Food', amountMinor: 12000 },
    { ...expense, id: 'transport', category: 'Transportation', amountMinor: 6000 },
    { ...expense, id: 'fun', category: 'Fun', amountMinor: 4000 },
  ];
  render(<BudgetPage {...props()} settings={settings} expenses={expenses} />);
  expect(within(categoryRow('housing')).getByText('PAID')).toBeInTheDocument();
  expect(within(categoryRow('food')).getByText('OVER')).toBeInTheDocument();
  expect(within(categoryRow('transport')).getByText('WATCH')).toBeInTheDocument();
  expect(within(categoryRow('fun')).getByText('OK')).toBeInTheDocument();
  expect(within(categoryRow('health')).getByText('OK')).toBeInTheDocument();
  expect(within(categoryRow('other')).getByText('NO LIMIT')).toBeInTheDocument();
  expect(categoryRow('housing').querySelector('.track i')).toBeNull();
  expect(categoryRow('food').querySelector('.track i')).toBeInTheDocument();
  expect(categoryRow('food').querySelector('.track span')).toHaveStyle({ width: '100%' });
  expect(categoryRow('other').querySelector('.track span')).toHaveStyle({ width: '0%' });
});

it('saves monthly and category limits through their own controls', () => {
  const callbacks = props();
  render(<BudgetPage {...callbacks} />);
  const monthly = screen.getByRole('textbox', { name: 'Monthly limit' });
  fireEvent.change(monthly, { target: { value: '1,000.25' } });
  fireEvent.blur(monthly);
  expect(callbacks.onBudget).toHaveBeenCalledExactlyOnceWith(100025);
  const food = screen.getByRole('textbox', { name: 'Limit for food' });
  fireEvent.change(food, { target: { value: '200.50' } });
  fireEvent.keyDown(food, { key: 'Enter' });
  expect(callbacks.onLimit).toHaveBeenCalledExactlyOnceWith('Food', 20050);
});

it('toggles the mobile category limit editing state', () => {
  render(<BudgetPage {...props()} />);
  fireEvent.click(screen.getByRole('button', { name: 'edit limits' }));
  expect(screen.getByRole('button', { name: 'done' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'done' }));
  expect(screen.getByRole('button', { name: 'edit limits' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

it('shows saved recurring costs and dispatches stop and add actions', () => {
  const callbacks = props();
  const settings: StoredData['settings'] = {
    ...empty.settings,
    recurring: [
      {
        id: 'phone',
        description: 'Phone plan',
        amountMinor: 2500,
        category: 'Other',
        day: 20,
        startDate: '2026-09-01',
        lastAppliedMonth: null,
      },
    ],
  };
  render(<BudgetPage {...callbacks} settings={settings} />);
  expect(screen.getByText('Phone plan')).toBeInTheDocument();
  expect(screen.getByText('#other · monthly · day 20')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Stop repeating Phone plan' }));
  expect(callbacks.onRemoveRepeat).toHaveBeenCalledExactlyOnceWith('phone');
  fireEvent.click(screen.getByRole('button', { name: /Add another from the command bar/ }));
  expect(callbacks.onRepeat).toHaveBeenCalledOnce();
});

it('switches to adjacent months through budget navigation', () => {
  const callbacks = props();
  render(<BudgetPage {...callbacks} />);
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(callbacks.onMonth.mock.calls).toEqual([['2026-08'], ['2026-10']]);
});

it('lists fixed expenses without an active recurring rule with their recorded date', () => {
  const expenses: Expense[] = [
    {
      ...expense,
      id: 'rent',
      category: 'Housing',
      amountMinor: 80000,
      description: 'Rent',
      fixed: true,
    },
    { ...expense, id: 'unnamed', category: 'Health', amountMinor: 5000, fixed: true },
    { ...expense, id: 'variable', category: 'Housing', description: 'Furniture', fixed: false },
  ];
  render(<BudgetPage {...props()} expenses={expenses} />);
  const rent = screen.getByText('Rent').closest('.fixed-cost') as HTMLElement;
  expect(within(rent).getByText('#housing · fixed · SEP 1')).toBeInTheDocument();
  expect(within(rent).getByText('$800.00')).toBeInTheDocument();
  expect(screen.getByText('Health', { selector: '.fixed-cost strong' })).toBeInTheDocument();
  expect(screen.queryByText('Furniture')).not.toBeInTheDocument();
  expect(within(rent).queryByRole('button')).not.toBeInTheDocument();
});

it('keeps stopped recurring expenses visible and avoids duplicating active recurring costs', () => {
  const settings: StoredData['settings'] = {
    ...empty.settings,
    recurring: [
      {
        id: 'phone',
        description: 'Phone plan',
        amountMinor: 2500,
        category: 'Other',
        day: 20,
        startDate: '2026-09-01',
        lastAppliedMonth: '2026-09',
      },
    ],
  };
  const expenses: Expense[] = [
    {
      ...expense,
      id: 'phone-charge',
      amountMinor: 2500,
      description: 'Phone plan',
      fixed: true,
      recurringId: 'phone',
    },
    {
      ...expense,
      id: 'gym-charge',
      amountMinor: 5000,
      description: 'Gym',
      fixed: true,
      recurringId: 'stopped-gym',
    },
  ];
  render(<BudgetPage {...props()} settings={settings} expenses={expenses} />);
  expect(screen.getAllByText('Phone plan', { selector: '.fixed-cost strong' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Stop repeating Phone plan' })).toBeInTheDocument();
  expect(screen.getByText('Gym', { selector: '.fixed-cost strong' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Stop repeating Gym' })).not.toBeInTheDocument();
});

it('opens settings through the budget footer shortcut', () => {
  const callbacks = props();
  render(<BudgetPage {...callbacks} />);
  fireEvent.click(screen.getByRole('button', { name: 'settings' }));
  expect(callbacks.onSettings).toHaveBeenCalledOnce();
});
