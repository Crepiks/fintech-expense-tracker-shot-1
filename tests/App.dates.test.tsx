import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import { appTestLifecycle, stored, submitEntry } from './appHelpers';

appTestLifecycle();
beforeEach(() => vi.setSystemTime(new Date(2026, 8, 20, 12)));

function openSelectedDay() {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'September 1, 2026, $0.00' }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Selected day' })).getByRole('button', { name: /add to this day/ }));
}

it.each([
  ['12 lunch #food', '2026-09-01'],
  ['12 lunch #food today', '2026-09-20'],
  ['12 lunch #food yesterday', '2026-09-19'],
  ['12 lunch #food fri', '2026-09-18'],
])('persists the intended date for %s from a different selected day', (command, date) => {
  openSelectedDay();
  submitEntry(command);
  expect(stored().expenses).toMatchObject([{ date, amountMinor: 1200, category: 'Food', description: 'lunch' }]);
  expect(screen.queryByRole('dialog', { name: 'New entry' })).not.toBeInTheDocument();
});

it('creates and applies a recurring cost starting today from a different selected day', () => {
  openSelectedDay();
  submitEntry('/repeat phone 25 monthly #other');
  expect(stored().settings.recurring).toMatchObject([{ description: 'phone', day: 20, startDate: '2026-09-20', lastAppliedMonth: '2026-09' }]);
  expect(stored().expenses).toMatchObject([{ date: '2026-09-20', description: 'phone', amountMinor: 2500, fixed: true }]);
});
