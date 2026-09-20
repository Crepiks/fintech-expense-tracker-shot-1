import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { Modal } from '../../src/components/Modal';

it('opens an accessible dialog containing its supplied content', () => {
  render(
    <Modal title="Edit expense" onClose={vi.fn()}>
      <p>Expense details</p>
    </Modal>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Edit expense' });
  expect(dialog).toHaveAttribute('open');
  expect(dialog).toHaveClass('modal');
  expect(dialog).toHaveTextContent('Expense details');
});

it('preserves a supplied modal class', () => {
  render(
    <Modal title="Import expenses" className="import-dialog" onClose={vi.fn()}>
      <p>Choose a file</p>
    </Modal>,
  );
  expect(screen.getByRole('dialog', { name: 'Import expenses' })).toHaveClass(
    'modal',
    'import-dialog',
  );
});

it('uses the native Escape cancel event to request controlled dismissal', () => {
  const onClose = vi.fn();
  render(
    <Modal title="Add expense" onClose={onClose}>
      <button>Save</button>
    </Modal>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Add expense' });
  const cancel = new Event('cancel', { bubbles: false, cancelable: true });
  fireEvent(dialog, cancel);
  expect(cancel.defaultPrevented).toBe(true);
  expect(onClose).toHaveBeenCalledOnce();
  expect(dialog).toHaveAttribute('open');
});

it('closes and restores the opener focus when the parent dismisses the dialog', () => {
  function Example() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open entry</button>
        {open && (
          <Modal title="Entry" onClose={() => setOpen(false)}>
            <button>Amount</button>
          </Modal>
        )}
      </>
    );
  }
  render(<Example />);
  const opener = screen.getByRole('button', { name: 'Open entry' });
  opener.focus();
  fireEvent.click(opener);
  const dialog = screen.getByRole('dialog', { name: 'Entry' });
  screen.getByRole('button', { name: 'Amount' }).focus();
  expect(opener).not.toHaveFocus();
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(dialog).not.toHaveAttribute('open');
  expect(opener).toHaveFocus();
});
