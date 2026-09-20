import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LimitInput } from '../../src/components/LimitInput';

it('shows a saved amount and accepts synchronized or cleared values', () => {
  const props = { label: 'Food limit', onSave: vi.fn() };
  const { rerender } = render(<LimitInput {...props} value={12345} />);
  expect(screen.getByRole('textbox', { name: 'Food limit' })).toHaveValue('123.45');
  rerender(<LimitInput {...props} value={67890} />);
  expect(screen.getByRole('textbox', { name: 'Food limit' })).toHaveValue('678.90');
  rerender(<LimitInput {...props} value={null} />);
  expect(screen.getByPlaceholderText('No limit')).toHaveValue('');
});

it('saves exact minor units when a valid amount loses focus', () => {
  const onSave = vi.fn();
  render(<LimitInput label="Food limit" value={null} onSave={onSave} />);
  const input = screen.getByRole('textbox', { name: 'Food limit' });
  fireEvent.change(input, { target: { value: '1,234.56' } });
  fireEvent.blur(input);
  expect(onSave).toHaveBeenCalledExactlyOnceWith(123456);
  expect(input).toHaveAttribute('aria-invalid', 'false');
});

it('saves with Enter and leaves other keys available for editing', () => {
  const onSave = vi.fn();
  render(<LimitInput label="Food limit" value={null} onSave={onSave} />);
  const input = screen.getByRole('textbox', { name: 'Food limit' });
  fireEvent.change(input, { target: { value: '0.01' } });
  fireEvent.keyDown(input, { key: 'ArrowLeft' });
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onSave).toHaveBeenCalledExactlyOnceWith(1);
});

it.each(['', '   '])('clears a limit with empty input %j', value => {
  const onSave = vi.fn();
  render(<LimitInput label="Food limit" value={20000} onSave={onSave} />);
  const input = screen.getByRole('textbox', { name: 'Food limit' });
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
  expect(onSave).toHaveBeenCalledExactlyOnceWith(null);
});

it('rejects invalid input accessibly and clears the error after correction', () => {
  const onSave = vi.fn();
  render(<LimitInput label="Food limit" value={20000} onSave={onSave} />);
  const input = screen.getByRole('textbox', { name: 'Food limit' });
  fireEvent.change(input, { target: { value: '0' } });
  fireEvent.blur(input);
  expect(screen.getByRole('alert')).toHaveTextContent('Amount must be greater than 0.');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '250.50' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onSave).toHaveBeenCalledExactlyOnceWith(25050);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(input).toHaveAttribute('aria-invalid', 'false');
});
