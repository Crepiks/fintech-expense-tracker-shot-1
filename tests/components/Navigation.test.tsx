import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Navigation, type View } from '../../src/components/Navigation';

const props = () => ({
  view: 'calendar' as View,
  onView: vi.fn(),
  onAdd: vi.fn(),
  onSettings: vi.fn(),
});

it.each<View>(['calendar', 'ledger', 'budget'])(
  'marks %s as the current page on both navigation surfaces',
  (view) => {
    render(<Navigation {...props()} view={view} />);
    for (const label of ['Main navigation', 'Mobile navigation']) {
      const navigation = within(screen.getByRole('navigation', { name: label }));
      for (const destination of ['calendar', 'ledger', 'budget']) {
        const button = navigation.getByRole('button', { name: destination });
        if (destination === view) expect(button).toHaveAttribute('aria-current', 'page');
        else expect(button).not.toHaveAttribute('aria-current');
      }
    }
  },
);

it('opens every view from desktop and mobile navigation', () => {
  const callbacks = props();
  render(<Navigation {...callbacks} />);
  for (const label of ['Main navigation', 'Mobile navigation']) {
    const navigation = within(screen.getByRole('navigation', { name: label }));
    for (const destination of ['calendar', 'ledger', 'budget']) {
      fireEvent.click(navigation.getByRole('button', { name: destination }));
      expect(callbacks.onView).toHaveBeenLastCalledWith(destination);
    }
  }
  expect(callbacks.onView).toHaveBeenCalledTimes(6);
});

it('opens the entry command from the header and the mobile add button', () => {
  const callbacks = props();
  render(<Navigation {...callbacks} />);
  fireEvent.click(screen.getByRole('button', { name: /12\.50 lunch #food yesterday/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
  expect(callbacks.onAdd).toHaveBeenCalledTimes(2);
});

it('offers the budget command when the budget page is active', () => {
  const callbacks = props();
  render(<Navigation {...callbacks} view="budget" />);
  fireEvent.click(screen.getByRole('button', { name: /\/budget #food 450/ }));
  expect(callbacks.onAdd).toHaveBeenCalledOnce();
});

it('opens settings from its named header action', () => {
  const callbacks = props();
  render(<Navigation {...callbacks} />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  expect(callbacks.onSettings).toHaveBeenCalledOnce();
});
