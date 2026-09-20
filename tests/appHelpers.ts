import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { STORAGE_KEY } from '../src/storage/storage';
import type { StoredData } from '../src/domain/types';

export function appTestLifecycle() {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 19, 12));
    let nextId = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
}

export const stored = (): StoredData => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
export const seed = (data: StoredData) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
export function receiveRemote(data: StoredData) {
  seed(data);
  fireEvent(window, new StorageEvent('storage', { key: STORAGE_KEY, storageArea: localStorage, newValue: JSON.stringify(data) }));
}
export const navigate = (name: string) => fireEvent.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('button', { name }));
export const openEntry = () => fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
export function submitEntry(text: string) {
  const dialog = within(screen.getByRole('dialog', { name: 'New entry' }));
  fireEvent.change(dialog.getByLabelText('TYPE IT LIKE A NOTE'), { target: { value: text } });
  fireEvent.click(dialog.getByRole('button', { name: text.trim().startsWith('/') ? /^run$/ : /^add$/ }));
}
export function addNote(text: string) { openEntry(); submitEntry(text); }
export const editExpense = (name: string) => fireEvent.click(screen.getAllByRole('button', { name })[0]);
export function cancelDialog(title: string) {
  fireEvent(screen.getByRole('dialog', { name: title }), new Event('cancel', { cancelable: true }));
}
export const openSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
export const closeSettings = () => fireEvent.click(within(screen.getByRole('dialog', { name: 'Settings' })).getByRole('button', { name: 'close' }));
export function csvFile(text: string) {
  const file = new File([text], 'expenses.csv', { type: 'text/csv' });
  // jsdom lacks File.text; this is the browser file-reading boundary.
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  return file;
}
