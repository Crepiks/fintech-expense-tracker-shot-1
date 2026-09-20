import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { QuickEntry } from '../../src/components/QuickEntry';
import type { Expense } from '../../src/domain/types';
import { expense } from '../fixtures';

function props() {
  return { today: '2026-09-20', date: '2026-09-20', month: '2026-09', initialText: '',
    expenses: [] as Expense[], canAdd: true, onRun: vi.fn<(_: string) => string | null>(() => null),
    onAdd: vi.fn(), onMonth: vi.fn(), onClose: vi.fn() };
}
const note = () => screen.getByRole('textbox', { name: 'TYPE IT LIKE A NOTE' });
const typeNote = (value: string) => fireEvent.change(note(), { target: { value } });

it('opens with an empty note, the selected date and entry guidance', () => {
  render(<QuickEntry {...props()} date="2026-09-12" />);
  expect(screen.getByRole('dialog', { name: 'New entry' })).toBeVisible();
  expect(note()).toHaveValue('');
  expect(note()).toHaveFocus();
  expect(screen.getByText('SAT · SEP 12')).toBeInTheDocument();
  expect(screen.getByText('// start with an amount, e.g. 12.50 lunch #food')).toBeInTheDocument();
  expect(screen.getByText('// your recent entries will appear here.')).toBeInTheDocument();
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '#food' })).toHaveAttribute('aria-pressed', 'false');
});

it('previews the parsed amount, category, date and description', () => {
  render(<QuickEntry {...props()} initialText="12.50 lunch #food yesterday" />);
  expect(screen.getByText('$12.50')).toBeInTheDocument();
  expect(screen.getByText('#food', { selector: 'strong' })).toBeInTheDocument();
  expect(screen.getByText('SAT · SEP 19')).toBeInTheDocument();
  expect(screen.getByText('lunch', { selector: 'strong' })).toBeInTheDocument();
  expect(screen.getByText('// looks right. press enter')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '#food' })).toHaveAttribute('aria-pressed', 'true');
});

it('uses the selected date for an amount without a date or description', () => {
  render(<QuickEntry {...props()} date="2026-09-12" initialText="25" />);
  expect(screen.getByText('$25.00')).toBeInTheDocument();
  expect(screen.getByText('#other', { selector: 'strong' })).toBeInTheDocument();
  expect(screen.getByText('SAT · SEP 12')).toBeInTheDocument();
  expect(screen.getByText('—', { selector: 'strong' })).toBeInTheDocument();
});

it('warns when a parsed date lies after today', () => {
  render(<QuickEntry {...props()} initialText="12 lunch #food 2026-10-01" />);
  expect(screen.getByText('THU · OCT 1')).toBeInTheDocument();
  expect(screen.getByText('// this date is in the future.')).toBeInTheDocument();
});

it.each([
  ['12 lunch #food', 'add'], ['12 lunch #food', 'add expense'],
  ['/budget 1000', 'run'], ['/budget 1000', 'run command'],
])('runs %s and closes from the %s action', (initialText, action) => {
  const callbacks = props();
  render(<QuickEntry {...callbacks} initialText={initialText} />);
  fireEvent.click(screen.getByRole('button', { name: action }));
  expect(callbacks.onRun).toHaveBeenCalledExactlyOnceWith(initialText);
  expect(callbacks.onClose).toHaveBeenCalledOnce();
});

it('shows submission failures without closing and clears them when the note changes', () => {
  const callbacks = props();
  callbacks.onRun.mockReturnValue('Choose a known category tag.');
  render(<QuickEntry {...callbacks} initialText="12 #unknown" />);
  fireEvent.click(screen.getByRole('button', { name: 'add expense' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a known category tag.');
  expect(callbacks.onClose).not.toHaveBeenCalled();
  expect(note()).toHaveValue('12 #unknown');
  typeNote('12 #food');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('keeps the dialog open and focuses a cleared note after saving another entry', () => {
  const callbacks = props();
  render(<QuickEntry {...callbacks} initialText="12 lunch #food" />);
  fireEvent.click(screen.getByRole('button', { name: 'add & keep open' }));
  expect(callbacks.onRun).toHaveBeenCalledExactlyOnceWith('12 lunch #food');
  expect(callbacks.onClose).not.toHaveBeenCalled();
  expect(note()).toHaveValue('');
  expect(note()).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('Saved. Ready for another.');
  typeNote('2 bus #transport');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

it('submits with Enter and keeps open with Shift+Enter', () => {
  const callbacks = props();
  render(<QuickEntry {...callbacks} initialText="12 lunch #food" />);
  fireEvent.keyDown(note(), { key: 'Enter', shiftKey: true });
  expect(callbacks.onRun).toHaveBeenNthCalledWith(1, '12 lunch #food');
  expect(callbacks.onClose).not.toHaveBeenCalled();
  expect(note()).toHaveValue('');
  typeNote('5 bus #transport');
  fireEvent.keyDown(note(), { key: 'Enter' });
  expect(callbacks.onRun).toHaveBeenNthCalledWith(2, '5 bus #transport');
  expect(callbacks.onClose).toHaveBeenCalledOnce();
});

it('does not submit ordinary keys or an Enter used for input composition', () => {
  const callbacks = props();
  render(<QuickEntry {...callbacks} initialText="12 lunch #food" />);
  fireEvent.keyDown(note(), { key: 'ArrowLeft' });
  fireEvent.keyDown(note(), { key: 'Enter', isComposing: true });
  expect(callbacks.onRun).not.toHaveBeenCalled();
  expect(callbacks.onClose).not.toHaveBeenCalled();
  expect(note()).toHaveValue('12 lunch #food');
});

it('replaces category tokens, appends a relative date and clears a prior error', () => {
  const callbacks = props();
  callbacks.onRun.mockReturnValue('Please choose a category.');
  render(<QuickEntry {...callbacks} initialText="8 bus #food" />);
  fireEvent.click(screen.getByRole('button', { name: 'add expense' }));
  expect(screen.getByRole('alert')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '#transport' }));
  expect(note()).toHaveValue('8 bus #transport');
  expect(note()).toHaveFocus();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'yesterday' }));
  expect(note()).toHaveValue('8 bus #transport yesterday');
  expect(screen.getByText('SAT · SEP 19')).toBeInTheDocument();
});

it('inserts tokens into an empty note without adding leading whitespace', () => {
  render(<QuickEntry {...props()} />);
  fireEvent.click(screen.getByRole('button', { name: '#fun' }));
  expect(note()).toHaveValue('#fun');
  typeNote('');
  fireEvent.click(screen.getByRole('button', { name: 'fri' }));
  expect(note()).toHaveValue('fri');
});

it('opens command suggestions and selects a complete recurring command', () => {
  render(<QuickEntry {...props()} />);
  fireEvent.click(screen.getByRole('button', { name: '/ commands' }));
  expect(note()).toHaveValue('/');
  expect(screen.getByRole('heading', { name: 'COMMANDS' })).toBeInTheDocument();
  expect(screen.getByText('Choose a command below, or finish typing.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'TAP TO INSERT' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /\/repeat phone 25 monthly #other/ }));
  expect(note()).toHaveValue('/repeat phone 25 monthly #other');
  expect(note()).toHaveFocus();
  expect(screen.getByText('Create a monthly fixed cost.')).toBeInTheDocument();
});

it.each([
  ['/budget 1000', 'Set monthly limit to $1,000.00.'],
  ['/budget off', 'Set monthly limit to no limit.'],
  ['/budget #food 450', 'Set #food limit to $450.00.'],
  ['/budget #food off', 'Set #food limit to no limit.'],
])('previews the effect of %s', (initialText, expected) => {
  render(<QuickEntry {...props()} initialText={initialText} />);
  expect(screen.getByText(expected)).toBeInTheDocument();
  expect(screen.queryByText('AMOUNT')).not.toBeInTheDocument();
});

it('offers the three newest expenses without mutating their order and reuses a selected note', () => {
  const expenses: Expense[] = [
    { ...expense, id: 'old', createdAt: 1, amountMinor: 100, description: 'old note' },
    { ...expense, id: 'newest', createdAt: 4, amountMinor: 400, description: 'Coffee' },
    { ...expense, id: 'middle', createdAt: 2, amountMinor: 200, description: 'Bus', category: 'Transportation' },
    { ...expense, id: 'unnamed', createdAt: 3, amountMinor: 300, description: undefined, category: 'Other' },
  ];
  render(<QuickEntry {...props()} expenses={expenses} />);
  const recent = screen.getAllByRole('button').filter(button => button.textContent?.startsWith('↺'));
  expect(recent.map(button => button.querySelector('code')?.textContent)).toEqual(['4.00 Coffee #food', '3.00  #other', '2.00 Bus #transport']);
  expect(screen.queryByRole('button', { name: /old note/ })).not.toBeInTheDocument();
  expect(expenses.map(item => item.id)).toEqual(['old', 'newest', 'middle', 'unnamed']);
  fireEvent.click(recent[0]);
  expect(note()).toHaveValue('4.00 Coffee #food');
  expect(note()).toHaveFocus();
  expect(screen.getByText('$4.00')).toBeInTheDocument();
});

it('shows and hides the real manual form and navigates to the saved month', () => {
  const callbacks = props();
  render(<QuickEntry {...callbacks} date="2026-08-12" />);
  fireEvent.click(screen.getByRole('button', { name: 'prefer a form?' }));
  const form = screen.getByRole('form', { name: 'Add an expense' });
  expect(within(form).getByLabelText('Date')).toHaveValue('2026-08-12');
  fireEvent.change(within(form).getByLabelText('Amount (USD)'), { target: { value: '8.50' } });
  fireEvent.change(within(form).getByLabelText('Category'), { target: { value: 'Food' } });
  fireEvent.change(within(form).getByLabelText('Description (optional)'), { target: { value: ' Lunch ' } });
  fireEvent.submit(form);
  expect(callbacks.onAdd).toHaveBeenCalledExactlyOnceWith({ amountMinor: 850, category: 'Food', date: '2026-08-12', description: 'Lunch' });
  fireEvent.click(screen.getByRole('button', { name: 'View August 2026' }));
  expect(callbacks.onMonth).toHaveBeenCalledExactlyOnceWith('2026-08');
  expect(callbacks.onRun).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'hide form' }));
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
});

it('passes record-limit restrictions through to the manual form', () => {
  const callbacks = props();
  render(<QuickEntry {...callbacks} canAdd={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'prefer a form?' }));
  const form = screen.getByRole('form', { name: 'Add an expense' });
  expect(within(form).getByRole('button', { name: 'Add an expense' })).toBeDisabled();
  fireEvent.submit(form);
  expect(screen.getByText(/You have reached 10,000 expenses/)).toBeInTheDocument();
  expect(callbacks.onAdd).not.toHaveBeenCalled();
});

it('cancels without submitting the draft', () => {
  const callbacks = props();
  render(<QuickEntry {...callbacks} initialText="12 lunch" />);
  fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
  expect(callbacks.onClose).toHaveBeenCalledOnce();
  expect(callbacks.onRun).not.toHaveBeenCalled();
});

it('uses the real current day for manual-form warnings opened on a past date', () => {
  render(<QuickEntry {...props()} date="2026-08-12" />);
  fireEvent.click(screen.getByRole('button', { name: 'prefer a form?' }));
  const date = screen.getByLabelText('Date');
  expect(date).toHaveValue('2026-08-12');
  fireEvent.change(date, { target: { value: '2026-08-20' } });
  expect(screen.queryByText('This date is in the future.')).not.toBeInTheDocument();
  fireEvent.change(date, { target: { value: '2026-09-21' } });
  expect(screen.getByText('This date is in the future.')).toBeInTheDocument();
});

it.each([
  ['today', 'SUN · SEP 20'], ['yesterday', 'SAT · SEP 19'],
  ['fri', 'FRI · SEP 18'], ['sep 12', 'SAT · SEP 12'],
])('previews explicit %s relative to today instead of the selected calendar date', (suffix, label) => {
  render(<QuickEntry {...props()} date="2025-09-01" initialText={`12 lunch #food ${suffix}`} />);
  expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.getByText('// looks right. press enter')).toBeInTheDocument();
});

it('focuses the note after the native dialog assigns its initial focus', () => {
  const show = vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
    this.querySelector('button')!.focus();
  });
  try {
    render(<QuickEntry {...props()} />);
    expect(note()).toHaveFocus();
  } finally { show.mockRestore(); }
});
