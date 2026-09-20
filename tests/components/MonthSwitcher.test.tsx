import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MonthSwitcher } from '../../src/components/MonthSwitcher';

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
