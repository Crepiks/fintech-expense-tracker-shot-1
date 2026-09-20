import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
import { appTestLifecycle, editExpense, navigate, openSettings, seed, stored } from './appHelpers';
import { empty, expense } from './fixtures';
import type { RecurringCost } from '../src/domain/types';

appTestLifecycle();
const rent: RecurringCost = {
  id: 'rent', description: 'Rent', amountMinor: 50000, category: 'Housing', day: 25,
  startDate: '2026-09-01', lastAppliedMonth: null,
};

it('reserves the same upcoming recurring costs in calendar, budget and Settings daily allowances', () => {
  vi.setSystemTime(new Date(2026, 8, 20, 12));
  seed({ ...empty, settings: { ...empty.settings, monthlyBudgetMinor: 61000, recurring: [rent] } });
  render(<App />);
  expect(screen.getByText('$10.00/day')).toBeInTheDocument();
  navigate('budget');
  expect(screen.getByText('safe to spend / day', { selector: 'dt' }).nextElementSibling).toHaveTextContent('$10.00');
  openSettings();
  const settings = within(screen.getByRole('dialog', { name: 'Settings' }));
  expect(settings.getByText('Safe to spend today: USD 10')).toBeInTheDocument();
  expect(settings.getByLabelText('Budget remaining')).toHaveTextContent('USD 610');
  expect(settings.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

it('does not reserve an upcoming recurring charge twice when it is already recorded', () => {
  vi.setSystemTime(new Date(2026, 8, 20, 12));
  seed({ expenses: [{ ...expense, amountMinor: 50000, date: '2026-09-25', fixed: true, recurringId: 'rent' }],
    version: 1, settings: { ...empty.settings, monthlyBudgetMinor: 61000, recurring: [rent] } });
  render(<App />);
  expect(screen.getByText('$10.00/day')).toBeInTheDocument();
  openSettings();
  expect(screen.getByText('Safe to spend today: USD 10')).toBeInTheDocument();
  expect(screen.getByLabelText('Budget remaining')).toHaveTextContent('USD 110');
});

it('keeps the recorded balance but hides spendable guidance when future recurring costs exceed it', () => {
  vi.setSystemTime(new Date(2026, 8, 20, 12));
  seed({ ...empty, settings: { ...empty.settings, monthlyBudgetMinor: 40000, recurring: [rent] } });
  render(<App />);
  expect(screen.getByText('$0.00/day')).toBeInTheDocument();
  openSettings();
  expect(screen.getByLabelText('Budget remaining')).toHaveTextContent('USD 400');
  expect(screen.queryByText(/Safe to spend today/)).not.toBeInTheDocument();
});

it('applies a waiting recurring charge immediately when deleting a normal expense frees capacity', () => {
  vi.setSystemTime(new Date(2026, 8, 20, 12));
  const expenses = Array.from({ length: 10000 }, (_, index) => ({
    ...expense, id: String(index), date: index === 0 ? '2026-09-20' : '2026-08-01',
  }));
  seed({ ...empty, expenses, settings: { ...empty.settings, recurring: [{ ...rent, day: 20 }] } });
  render(<App />);
  expect(stored().settings.recurring?.[0].lastAppliedMonth).toBeNull();
  expect(stored().expenses.some(item => item.recurringId === 'rent')).toBe(false);
  editExpense('Edit Food expense');
  fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
  expect(stored().expenses).toHaveLength(10000);
  expect(stored().expenses.some(item => item.id === '0')).toBe(false);
  expect(stored().expenses.filter(item => item.recurringId === 'rent')).toMatchObject([
    { id: 'recurring:rent:2026-09', amountMinor: 50000, date: '2026-09-20', fixed: true },
  ]);
  expect(stored().settings.recurring?.[0].lastAppliedMonth).toBe('2026-09');
  expect(screen.getByRole('button', { name: 'Edit Rent' })).toBeInTheDocument();
});
