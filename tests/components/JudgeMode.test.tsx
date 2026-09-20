import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { JudgeMode } from '../../src/components/JudgeMode';
import { ScenarioDialog } from '../../src/components/ScenarioDialog';

it('opens a real validation scenario with ten passing rows and closes', () => {
  render(<JudgeMode />);
  fireEvent.click(screen.getByRole('button', { name: 'Run validation scenario' }));
  expect(
    screen.getByRole('dialog', { name: 'Validation scenario (section 6 of the brief)' }),
  ).toBeInTheDocument();
  expect(screen.getByText('10 of 10 checks passed')).toBeInTheDocument();
  expect(screen.getAllByText('PASS')).toHaveLength(10);
  expect(screen.getAllByText('3,000')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Run again' }));
  expect(screen.getAllByText('PASS')).toHaveLength(10);
  fireEvent.click(screen.getByRole('button', { name: 'Close validation' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Run validation scenario' })).toHaveFocus();
});
it('closes when the browser cancels the modal with Escape', () => {
  render(<JudgeMode />);
  fireEvent.click(screen.getByRole('button', { name: 'Run validation scenario' }));
  fireEvent(screen.getByRole('dialog'), new Event('cancel'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Run validation scenario' })).toHaveFocus();
});
it('clearly reports a failed check instead of always claiming success', () => {
  render(
    <ScenarioDialog
      results={[
        { step: 'After adding', label: 'Total', expected: '3,000', actual: '2,000', pass: false },
      ]}
      onClose={vi.fn()}
      onRunAgain={vi.fn()}
    />,
  );
  expect(screen.getByText('0 of 1 checks passed')).toBeInTheDocument();
  expect(screen.getByText('FAIL')).toBeInTheDocument();
  expect(screen.getByText('2,000')).toBeInTheDocument();
});
