import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SpendChart } from '../../src/components/SpendChart';
import { monthInsights } from '../../src/domain/insights';
import { expense } from '../fixtures';
import type { Expense, RecurringCost } from '../../src/domain/types';

it('describes an empty month without a limit and draws a finite zero baseline', () => {
  const insights = monthInsights([], '2026-09', '2026-09-15', null);
  render(<SpendChart insights={insights} limit={null} />);
  const chart = screen.getByRole('img', {
    name: 'Cumulative spending $0.00; month-end estimate $0.00',
  });
  expect(chart).not.toHaveTextContent('limit');
  expect(within(chart).getByText('01')).toBeInTheDocument();
  expect(within(chart).getByText('30')).toBeInTheDocument();
  expect(chart.querySelector('circle')).toHaveAttribute('cx', '375');
  expect(chart.querySelector('circle')).toHaveAttribute('cy', '192');
  expect(chart.innerHTML).not.toMatch(/NaN|Infinity/);
});

it('shows the budget and observed spending with an over-budget forecast', () => {
  const insights = monthInsights(
    [{ ...expense, amountMinor: 20000 }],
    '2026-09',
    '2026-09-15',
    30000,
  );
  render(<SpendChart insights={insights} limit={30000} />);
  const chart = screen.getByRole('img', {
    name: 'Cumulative spending $200.00; month-end estimate $400.00; limit $300.00',
  });
  expect(within(chart).getByText('limit $300')).toBeInTheDocument();
  expect(within(chart).getByText('$200.00')).toBeInTheDocument();
  expect(chart.querySelector('circle')).toHaveAttribute('cy', '117');
  expect(chart.innerHTML).not.toMatch(/NaN|Infinity/);
});

it('keeps the accessible summary in compact charts while omitting axis labels', () => {
  const insights = monthInsights(
    [{ ...expense, amountMinor: 20000 }],
    '2026-09',
    '2026-09-15',
    30000,
  );
  render(<SpendChart insights={insights} limit={30000} compact />);
  const chart = screen.getByRole('img', {
    name: 'Cumulative spending $200.00; month-end estimate $400.00; limit $300.00',
  });
  expect(chart.querySelectorAll('text')).toHaveLength(0);
  expect(chart.querySelector('circle')).toHaveAttribute('cy', '117');
});

it('uses the recorded total as the completed-month forecast', () => {
  const insights = monthInsights(
    [{ ...expense, date: '2026-08-31', amountMinor: 10000 }],
    '2026-08',
    '2026-09-15',
    40000,
  );
  render(<SpendChart insights={insights} limit={40000} />);
  const chart = screen.getByRole('img', {
    name: 'Cumulative spending $100.00; month-end estimate $100.00; limit $400.00',
  });
  expect(within(chart).getByText('31')).toBeInTheDocument();
  expect(chart.querySelector('circle')).toHaveAttribute('cx', '700');
  expect(chart.querySelector('circle')).toHaveAttribute('cy', '154.5');
});

it('starts a future month at day zero while retaining known scheduled spending', () => {
  const insights = monthInsights(
    [{ ...expense, date: '2026-10-20', amountMinor: 10000 }],
    '2026-10',
    '2026-09-15',
    null,
  );
  render(<SpendChart insights={insights} limit={null} compact />);
  const chart = screen.getByRole('img', {
    name: 'Cumulative spending $0.00; month-end estimate $100.00',
  });
  expect(chart.querySelector('circle')).toHaveAttribute('cx', '50');
  expect(chart.querySelector('circle')).toHaveAttribute('cy', '192');
  expect(chart.innerHTML).not.toMatch(/NaN|Infinity/);
});

it.each(['recorded', 'pending'] as const)(
  'starts the pace line at one %s future fixed cost',
  (kind) => {
    const expenses: Expense[] =
      kind === 'recorded'
        ? [{ ...expense, date: '2026-09-25', amountMinor: 10000, fixed: true }]
        : [];
    const recurring: RecurringCost[] =
      kind === 'pending'
        ? [
            {
              id: 'phone',
              description: 'Phone',
              amountMinor: 10000,
              category: 'Other',
              day: 25,
              startDate: '2026-09-01',
              lastAppliedMonth: null,
            },
          ]
        : [];
    const insights = monthInsights(expenses, '2026-09', '2026-09-20', 100000, recurring);
    render(<SpendChart insights={insights} limit={100000} />);
    expect(insights.paceMinor).toBe(70000);
    // With a $1,000 axis, $100 maps to y=177 and $1,000 to y=42.
    expect(screen.getByRole('img').querySelector('.chart-pace')).toHaveAttribute(
      'd',
      'M50,177 L700,42',
    );
  },
);

it('keeps pace flat when fixed costs already exceed the monthly limit', () => {
  const insights = monthInsights(
    [{ ...expense, amountMinor: 20000, fixed: true }],
    '2026-09',
    '2026-09-20',
    10000,
  );
  render(<SpendChart insights={insights} limit={10000} />);
  expect(insights.paceMinor).toBe(20000);
  expect(screen.getByRole('img').querySelector('.chart-pace')).toHaveAttribute(
    'd',
    'M50,42 L700,42',
  );
});
