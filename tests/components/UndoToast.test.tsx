import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { UndoToast } from '../../src/components/UndoToast';
import { expense } from '../fixtures';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
it('restores the exact deleted record when Undo is pressed', () => {
  const onUndo = vi.fn();
  render(<UndoToast expense={expense} onUndo={onUndo} onExpire={vi.fn()} />);
  expect(screen.getByRole('status')).toHaveTextContent('USD 1,500 expense deleted');
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(onUndo).toHaveBeenCalledWith(expense);
});
it('expires after five seconds and cancels the previous delete timer', () => {
  const onExpire = vi.fn();
  const { rerender, unmount } = render(<UndoToast expense={expense} onUndo={vi.fn()} onExpire={onExpire} />);
  act(() => vi.advanceTimersByTime(4000));
  expect(onExpire).not.toHaveBeenCalled();
  rerender(<UndoToast expense={{ ...expense, id: 'two' }} onUndo={vi.fn()} onExpire={onExpire} />);
  act(() => vi.advanceTimersByTime(4000));
  expect(onExpire).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1000));
  expect(onExpire).toHaveBeenCalledTimes(1);
  unmount();
  act(() => vi.advanceTimersByTime(5000));
  expect(onExpire).toHaveBeenCalledTimes(1);
});
it('cancels the timer on unmount', () => {
  const onExpire = vi.fn();
  const { unmount } = render(<UndoToast expense={expense} onUndo={vi.fn()} onExpire={onExpire} />);
  unmount();
  act(() => vi.advanceTimersByTime(5000));
  expect(onExpire).not.toHaveBeenCalled();
});
