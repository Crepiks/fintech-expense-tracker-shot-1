import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ImportDialog } from '../../src/components/ImportDialog';

const csv =
  'date,description,category,amount,fixed\n2026-09-20,Lunch,Food,12.50,false\n2026-09-19,Rent,Housing,800,true';
const values = [
  { date: '2026-09-20', description: 'Lunch', category: 'Food', amountMinor: 1250 },
  { date: '2026-09-19', description: 'Rent', category: 'Housing', amountMinor: 80000, fixed: true },
];
const props = () => ({ today: '2026-09-20', count: 0, onImport: vi.fn(), onClose: vi.fn() });

function file(content = csv, read: () => Promise<string> = () => Promise.resolve(content)): File {
  const selected = new File([content], 'expenses.csv', { type: 'text/csv' });
  // File.text is a browser boundary missing from jsdom's File implementation.
  Object.defineProperty(selected, 'text', { value: read });
  return selected;
}
const select = (selected: File) =>
  fireEvent.change(screen.getByLabelText('Choose CSV'), { target: { files: [selected] } });

it('previews valid records and imports the entire batch only after confirmation', async () => {
  const callbacks = props();
  render(<ImportDialog {...callbacks} />);
  expect(screen.getByRole('dialog', { name: 'Import CSV' })).toHaveAttribute('open');
  expect(screen.getByRole('button', { name: 'Import expenses' })).toBeDisabled();
  select(file());
  expect(await screen.findByText('Ready to import 2 expenses.')).toHaveAttribute('role', 'status');
  expect(callbacks.onImport).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Import expenses' }));
  expect(callbacks.onImport).toHaveBeenCalledWith(values);
});

it.each([[], null])(
  'clears a previous preview when the file selection is cancelled (%j)',
  async (files) => {
    render(<ImportDialog {...props()} />);
    select(file());
    await screen.findByText('Ready to import 2 expenses.');
    fireEvent.change(screen.getByLabelText('Choose CSV'), { target: { files } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import expenses' })).toBeDisabled();
  },
);

it('shows a loading state and disables selection and confirmation while reading', async () => {
  let finish!: (value: string) => void;
  const pending = new Promise<string>((resolve) => {
    finish = resolve;
  });
  render(<ImportDialog {...props()} />);
  select(file(csv, () => pending));
  expect(screen.getByRole('status')).toHaveTextContent('Reading file…');
  expect(screen.getByLabelText('Choose CSV')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Import expenses' })).toBeDisabled();
  await act(async () => {
    finish(csv);
  });
  expect(screen.getByRole('status')).toHaveTextContent('Ready to import 2 expenses.');
  expect(screen.getByLabelText('Choose CSV')).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Import expenses' })).toBeEnabled();
});

it('rejects an invalid later row without importing the valid earlier row', async () => {
  const callbacks = props();
  render(<ImportDialog {...callbacks} />);
  select(file(`${csv}\n2026-09-20,Invalid,Food,-1,false`));
  expect(await screen.findByRole('alert')).toHaveTextContent('Row 4');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Import expenses' })).toBeDisabled();
  expect(callbacks.onImport).not.toHaveBeenCalled();
});

it('rejects files larger than 2 MB before reading them', () => {
  const callbacks = props();
  const read = vi.fn().mockResolvedValue(csv);
  const oversized = file(csv, read);
  Object.defineProperty(oversized, 'size', { value: 2_000_001 });
  render(<ImportDialog {...callbacks} />);
  select(oversized);
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a CSV smaller than 2 MB.');
  expect(read).not.toHaveBeenCalled();
  expect(callbacks.onImport).not.toHaveBeenCalled();
});

it('accepts a file at the maximum size when its records fit exactly in the ledger', async () => {
  const selected = file();
  Object.defineProperty(selected, 'size', { value: 2_000_000 });
  render(<ImportDialog {...props()} count={9998} />);
  select(selected);
  await screen.findByText('Ready to import 2 expenses.');
  expect(screen.getByRole('button', { name: 'Import expenses' })).toBeEnabled();
});

it('rejects a batch that would exceed the total ledger capacity', async () => {
  const callbacks = props();
  render(<ImportDialog {...callbacks} count={9999} />);
  select(file());
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This import would exceed the 10,000-expense limit.',
  );
  expect(screen.getByRole('button', { name: 'Import expenses' })).toBeDisabled();
  expect(callbacks.onImport).not.toHaveBeenCalled();
});

it('explains file read failures and allows a subsequent valid file', async () => {
  render(<ImportDialog {...props()} />);
  select(file(csv, () => Promise.reject(new Error('read failed'))));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not read this file. Try selecting it again.',
  );
  expect(screen.getByLabelText('Choose CSV')).toBeEnabled();
  select(file());
  await screen.findByText('Ready to import 2 expenses.');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('closes from cancel or the native dialog cancellation event', () => {
  const callbacks = props();
  render(<ImportDialog {...callbacks} />);
  fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
  const event = new Event('cancel', { bubbles: true, cancelable: true });
  fireEvent(screen.getByRole('dialog', { name: 'Import CSV' }), event);
  expect(event.defaultPrevented).toBe(true);
  expect(callbacks.onClose).toHaveBeenCalledTimes(2);
  expect(callbacks.onImport).not.toHaveBeenCalled();
});
