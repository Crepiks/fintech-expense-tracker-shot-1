import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CategoryDonut } from '../../src/components/CategoryDonut';
import { computeTotals } from '../../src/domain/calc';
import { expense } from '../fixtures';

it('shows a gray empty ring with a zero total and no filter buttons', () => {
  render(<CategoryDonut totals={computeTotals([])} filter={null} onFilter={vi.fn()} />);
  expect(screen.getByLabelText('Spending by category: no expenses')).toBeInTheDocument();
  expect(screen.getByText('0')).toBeInTheDocument();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
it('renders proportional slices and named amounts', () => {
  const totals = computeTotals([expense, { ...expense, id: 'two', category: 'Transportation', amountMinor: 50000 }]);
  render(<CategoryDonut totals={totals} filter={null} onFilter={vi.fn()} />);
  const food = screen.getByRole('button', { name: 'Food: USD 1,500' });
  expect(food).toHaveAttribute('stroke-dasharray', '75 25');
  expect(food).toHaveAttribute('stroke-dashoffset', '25');
  expect(screen.getByRole('button', { name: 'Transportation: USD 500' })).toHaveAttribute('stroke-dashoffset', '50');
  expect(screen.getByRole('button', { name: 'Filter Food' })).toHaveTextContent('75%');
});
it('toggles category filters by slice, legend, and keyboard', () => {
  const onFilter = vi.fn();
  const totals = computeTotals([expense]);
  const { rerender } = render(<CategoryDonut totals={totals} filter={null} onFilter={onFilter} />);
  const slice = screen.getByRole('button', { name: 'Food: USD 1,500' });
  fireEvent.click(slice);
  expect(onFilter).toHaveBeenLastCalledWith('Food');
  rerender(<CategoryDonut totals={totals} filter="Food" onFilter={onFilter} />);
  fireEvent.click(screen.getByRole('button', { name: 'Filter Food' }));
  expect(onFilter).toHaveBeenLastCalledWith(null);
  fireEvent.keyDown(slice, { key: 'Enter' });
  expect(onFilter).toHaveBeenCalledTimes(3);
  fireEvent.keyDown(slice, { key: ' ' });
  expect(onFilter).toHaveBeenCalledTimes(4);
  fireEvent.keyDown(slice, { key: 'ArrowRight' });
  expect(onFilter).toHaveBeenCalledTimes(4);
  expect(screen.getByRole('button', { name: 'Filter Food' })).toHaveAttribute('aria-pressed', 'true');
});

it('sorts slices by descending amount and dims only other categories', () => {
  const totals = computeTotals([expense, { ...expense, id: 'two', category: 'Transportation', amountMinor: 450000 }]);
  render(<CategoryDonut totals={totals} filter="Food" onFilter={vi.fn()} />);
  const transport = screen.getByRole('button', { name: 'Transportation: USD 4,500' });
  expect(transport).toHaveAttribute('stroke-dashoffset', '25');
  expect(transport).toHaveAttribute('opacity', '0.35');
  expect(screen.getByRole('button', { name: 'Food: USD 1,500' })).toHaveAttribute('opacity', '1');
  expect(screen.getByLabelText('Spending by category: Transportation 75%, Food 25%')).toBeInTheDocument();
});
