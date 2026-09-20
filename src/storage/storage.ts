import { emptyData, parseStoredData } from './schema';
import type { StoredData } from '../domain/types';

export const STORAGE_KEY = 'expense-tracker:v1';
export const RECOVERY_NOTICE =
  'Storage data was recovered. Invalid records were removed; a backup was saved in this browser.';

export function load(): { data: StoredData; notice: string } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = parseStoredData(raw);
    if (!parsed.recovered) return { data: parsed.data, notice: '' };
    try {
      window.localStorage.setItem(`${STORAGE_KEY}:backup`, raw!);
      return { data: parsed.data, notice: RECOVERY_NOTICE };
    } catch {
      return {
        data: parsed.data,
        notice: 'Storage data was recovered, but a backup could not be saved.',
      };
    }
  } catch {
    return {
      data: emptyData(),
      notice: 'Storage is unavailable. Changes will last only while this page is open.',
    };
  }
}
export function save(data: StoredData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
export function subscribe(
  callback: (result: ReturnType<typeof parseStoredData>, raw: string | null) => void,
): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    let raw: string | null;
    try {
      const storage = window.localStorage;
      if (event.storageArea !== null && event.storageArea !== storage) return;
      // Events can be queued behind a newer write. Reconcile with current storage.
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      return;
    } // Keep the current tab's data if storage becomes unreadable.
    callback(parseStoredData(raw), raw);
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
