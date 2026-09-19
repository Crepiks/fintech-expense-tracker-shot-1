import { expect, it, vi } from 'vitest';
import { runSelfTest } from '../../src/domain/selfTest';

it('checks the real add/delete scenario with explicit expected and actual results', () => {
  expect(runSelfTest()).toEqual([
    { label: 'After adding: total', expected: 300000, actual: 300000, pass: true },
    { label: 'After adding: Food', expected: 240000, actual: 240000, pass: true },
    { label: 'After adding: Transportation', expected: 60000, actual: 60000, pass: true },
    { label: 'After adding: categories equal total', expected: true, actual: true, pass: true },
    { label: 'After deleting: total', expected: 210000, actual: 210000, pass: true },
    { label: 'After deleting: Food', expected: 150000, actual: 150000, pass: true },
    { label: 'After deleting: Transportation', expected: 60000, actual: 60000, pass: true },
    { label: 'After deleting: categories equal total', expected: true, actual: true, pass: true },
  ]);
});
it('runs repeatedly without reading or changing user storage', () => {
  const read = vi.spyOn(Storage.prototype, 'getItem');
  const write = vi.spyOn(Storage.prototype, 'setItem');
  expect(runSelfTest().every(row => row.pass)).toBe(true);
  expect(runSelfTest().every(row => row.pass)).toBe(true);
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});
