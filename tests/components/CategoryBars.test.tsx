import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CategoryBars } from '../../src/components/CategoryBars';
import type { Category } from '../../src/domain/categories';

const totals: Record<Category, number> = {
  Food: 2500,
  Transportation: 1500,
  Housing: 80000,
  Study: 0,
  Fun: 0,
  Health: 0,
  Other: 0,
};
const categoryRow = (tag: string) => screen.getByText(tag).parentElement!.parentElement!;

it('shows spending and limits with proportional bars capped at one hundred percent', () => {
  render(
    <CategoryBars totals={totals} limits={{ Food: 10000, Transportation: 1000, Housing: 80000 }} />,
  );
  const food = categoryRow('#food');
  const transport = categoryRow('#transport');
  const housing = categoryRow('#housing');
  expect(food).toHaveTextContent('$25.00 / $100');
  expect(food.querySelector('.track span')).toHaveStyle({ width: '25%' });
  expect(transport).toHaveTextContent('$15.00 / $10');
  expect(transport.querySelector('.track span')).toHaveStyle({ width: '100%' });
  expect(housing.querySelector('.track span')).toHaveStyle({ width: '100%' });
});

it('keeps categories without a cap visible with a neutral empty track', () => {
  render(<CategoryBars totals={totals} limits={{}} />);
  const food = categoryRow('#food');
  const study = categoryRow('#study');
  expect(food).toHaveTextContent('$25.00 / —');
  expect(food.querySelector('.track span')).toHaveStyle({ width: '0%' });
  expect(study).toHaveTextContent('$0.00 / —');
  expect(screen.getByText('#other')).toBeInTheDocument();
  expect(screen.getByText('#health')).toBeInTheDocument();
  expect(screen.getByText('#fun')).toBeInTheDocument();
});
