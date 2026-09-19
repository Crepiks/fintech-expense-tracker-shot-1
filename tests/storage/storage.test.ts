import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { load, save, subscribe, STORAGE_KEY } from '../../src/storage/storage';
import { data, empty } from '../fixtures';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
it('loads absent storage without a warning', () => {
  expect(load()).toEqual({ data: empty, notice: '' });
});
it('round trips valid data', () => {
  expect(save(data)).toBe(true);
  expect(load()).toEqual({ data, notice: '' });
});
it('backs up corrupt raw data and explains recovery', () => {
  localStorage.setItem(STORAGE_KEY, 'broken');
  expect(load()).toMatchObject({ data: empty, notice: expect.stringContaining('recovered') });
  expect(localStorage.getItem(`${STORAGE_KEY}:backup`)).toBe('broken');
});
it('retains a recovery warning when backup storage is also full', () => {
  localStorage.setItem(STORAGE_KEY, 'broken');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  expect(load()).toEqual({ data: empty, notice: 'Storage data was recovered, but a backup could not be saved.' });
});
it('keeps the app usable when storage reads are blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(load()).toEqual({ data: empty, notice: 'Storage is unavailable. Changes will last only while this page is open.' });
});
it('reports failed writes without throwing', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  expect(save(data)).toBe(false);
});
it('delivers validated data and raw content from another tab', () => {
  const callback = vi.fn();
  const stop = subscribe(callback);
  const raw = JSON.stringify(data);
  localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: raw, storageArea: localStorage }));
  expect(callback).toHaveBeenCalledWith({ data, recovered: false }, raw);
  stop();
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }));
  expect(callback).toHaveBeenCalledTimes(1);
});
it('ignores other keys and session storage', () => {
  const callback = vi.fn();
  const stop = subscribe(callback);
  window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: '{}' }));
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, storageArea: sessionStorage }));
  expect(callback).not.toHaveBeenCalled();
  stop();
});
it('handles key removal, clearing all storage, and corrupt remote data', () => {
  const callback = vi.fn();
  const stop = subscribe(callback);
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }));
  expect(callback).toHaveBeenLastCalledWith({ data: empty, recovered: false }, null);
  window.dispatchEvent(new StorageEvent('storage', { key: null }));
  expect(callback).toHaveBeenCalledTimes(2);
  localStorage.setItem(STORAGE_KEY, 'bad');
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'bad' }));
  expect(callback).toHaveBeenLastCalledWith({ data: empty, recovered: true }, 'bad');
  stop();
});

it('preserves current state when storage becomes unreadable during synchronization', () => {
  const callback = vi.fn();
  const stop = subscribe(callback);
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }));
  expect(callback).not.toHaveBeenCalled();
  stop();
});
