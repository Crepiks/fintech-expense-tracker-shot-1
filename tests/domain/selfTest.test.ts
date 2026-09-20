import { expect, it, vi } from 'vitest';
import { runSelfTest } from '../../src/domain/selfTest';

it('checks the real add/delete scenario with explicit expected and actual results', () => {
  const checks = runSelfTest();
  expect(checks).toHaveLength(10);
  expect(checks.every((check) => check.pass)).toBe(true);
  expect(checks.map(({ expected, actual }) => [expected, actual])).toEqual([
    ['3', '3'],
    ['3,000', '3,000'],
    ['2,400', '2,400'],
    ['600', '600'],
    ['true', 'true'],
    ['2', '2'],
    ['2,100', '2,100'],
    ['1,500', '1,500'],
    ['600', '600'],
    ['true', 'true'],
  ]);
});
it('runs repeatedly without reading or changing user storage', () => {
  const read = vi.spyOn(Storage.prototype, 'getItem');
  const write = vi.spyOn(Storage.prototype, 'setItem');
  expect(runSelfTest().every((row) => row.pass)).toBe(true);
  expect(runSelfTest().every((row) => row.pass)).toBe(true);
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});
