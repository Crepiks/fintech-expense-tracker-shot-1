import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { downloadCsv } from '../../src/storage/download';

const BrowserBlob = Blob;
const createObjectURL = vi.fn().mockReturnValue('blob:ledger-export');
const revokeObjectURL = vi.fn();
const makeBlob = vi.fn(function (parts: BlobPart[], options: BlobPropertyBag) { return new BrowserBlob(parts, options); });
let clicked: { href: string; download: string } | null;

beforeEach(() => {
  vi.useFakeTimers();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  makeBlob.mockClear();
  clicked = null;
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  vi.stubGlobal('Blob', makeBlob);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked = { href: this.href, download: this.download };
  });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('downloads the exact CSV as a local UTF-8 blob with the requested filename', () => {
  const csv = 'date,description\r\n2026-09-20,Lunch\r\n';
  downloadCsv(csv, 'pocket-ledger-2026-09.csv');
  expect(makeBlob).toHaveBeenCalledWith([csv], { type: 'text/csv;charset=utf-8' });
  expect(createObjectURL).toHaveBeenCalledWith(expect.any(BrowserBlob));
  expect(clicked).toEqual({ href: 'blob:ledger-export', download: 'pocket-ledger-2026-09.csv' });
});

it('keeps the blob available briefly before releasing its object URL exactly once', () => {
  downloadCsv('date,description\r\n', 'empty-ledger.csv');
  expect(revokeObjectURL).not.toHaveBeenCalled();
  vi.advanceTimersByTime(999);
  expect(revokeObjectURL).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:ledger-export');
  vi.runAllTimers();
  expect(revokeObjectURL).toHaveBeenCalledOnce();
});
