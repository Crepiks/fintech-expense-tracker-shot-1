import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useExpenses } from '../../src/state/useExpenses';
import { STORAGE_KEY } from '../../src/storage/storage';
import { data, empty, expense } from '../fixtures';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
it('loads before persisting, including StrictMode remount effects', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const { result } = renderHook(useExpenses, { wrapper: StrictMode });
  expect(result.current.expenses).toEqual([expense]);
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(data);
});
it('persists add, remove, restore and budget changes across remounts', () => {
  const { result, unmount } = renderHook(useExpenses);
  act(() => result.current.add(expense));
  expect(result.current.expenses).toEqual([expense]);
  act(() => result.current.remove('one'));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).expenses).toEqual([]);
  act(() => result.current.restore(expense));
  act(() => result.current.setBudget(500000));
  unmount();
  const next = renderHook(useExpenses);
  expect(next.result.current.expenses).toEqual([expense]);
  expect(next.result.current.settings.monthlyBudgetMinor).toBe(500000);
});
it('shows and then clears a write failure notice after a successful change', () => {
  const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const { result } = renderHook(useExpenses);
  expect(result.current.storageNotice).toContain('Could not save');
  act(() => result.current.add(expense));
  expect(result.current.expenses).toEqual([expense]);
  fail.mockRestore();
  act(() => result.current.setBudget(500000));
  expect(result.current.storageNotice).toBe('');
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(data);
});
it('surfaces recovery notices', () => {
  localStorage.setItem(STORAGE_KEY, 'broken');
  const { result } = renderHook(useExpenses);
  expect(result.current.storageNotice).toContain('recovered');
  expect(result.current.expenses).toEqual([]);
});
it('accepts other-tab updates without echoing writes and skips identical events', () => {
  const { result } = renderHook(useExpenses);
  const write = vi.spyOn(Storage.prototype, 'setItem');
  const raw = JSON.stringify(data);
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: raw })));
  expect(result.current.expenses).toEqual([expense]);
  const same = result.current.expenses;
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: raw })));
  expect(result.current.expenses).toBe(same);
  expect(write).not.toHaveBeenCalled();
});
it('clears state when another tab removes storage', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const { result } = renderHook(useExpenses);
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null })));
  expect(result.current.expenses).toEqual(empty.expenses);
  expect(result.current.settings).toEqual(empty.settings);
});
it('warns on corrupt data received from another tab', () => {
  const { result } = renderHook(useExpenses);
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'bad' })));
  expect(result.current.storageNotice).toContain('recovered');
});
