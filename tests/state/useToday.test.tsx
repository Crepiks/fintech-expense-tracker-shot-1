import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useToday } from '../../src/state/useToday';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 30, 23, 59, 59)); });
afterEach(() => vi.useRealTimers());
it('updates the local date at midnight while a page remains open', () => {
  const { result } = renderHook(useToday);
  expect(result.current).toBe('2026-09-30');
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current).toBe('2026-10-01');
});
it('refreshes after a suspended tab regains focus or visibility and cleans up', () => {
  const { result, unmount } = renderHook(useToday);
  vi.setSystemTime(new Date(2026, 9, 2, 10));
  act(() => window.dispatchEvent(new Event('focus')));
  expect(result.current).toBe('2026-10-02');
  vi.setSystemTime(new Date(2026, 9, 3, 10));
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(result.current).toBe('2026-10-03');
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  act(() => window.dispatchEvent(new Event('focus')));
  expect(vi.getTimerCount()).toBe(0);
});
