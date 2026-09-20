import { useMemo } from 'react';
import { CURRENCY } from '../config';
import { CATEGORIES, CATEGORY_COLORS, type Category } from '../domain/categories';
import type { TotalsData } from '../domain/calc';
import { formatAmount } from '../domain/money';

type Props = {
  totals: TotalsData;
  filter: Category | null;
  onFilter: (category: Category | null) => void;
};
export function CategoryDonut({ totals, filter, onFilter }: Props) {
  const amounts = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        amount: totals.byCategory[category],
        percent:
          totals.totalMinor === 0 ? 0 : (totals.byCategory[category] / totals.totalMinor) * 100,
      }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [totals],
  );
  const total = formatAmount(totals.totalMinor);
  const toggle = (category: Category) => onFilter(filter === category ? null : category);
  let cumulative = 0;
  return (
    <div className="category-breakdown">
      <svg
        className="category-donut"
        viewBox="0 0 42 42"
        role="group"
        aria-label={`Spending by category: ${amounts.length ? amounts.map((item) => `${item.category} ${Math.round(item.percent)}%`).join(', ') : 'no expenses'}`}
      >
        <circle cx="21" cy="21" r="15.915" fill="none" stroke="#e2e6de" strokeWidth="6" />
        {amounts.map(({ category, amount, percent }) => {
          // Normalize offsets for Safari; pathLength maps percentages to ring length.
          const start = (125 - cumulative) % 100;
          cumulative += percent;
          return (
            <circle
              key={category}
              cx="21"
              cy="21"
              r="15.915"
              fill="none"
              stroke={CATEGORY_COLORS[category]}
              opacity={filter === null || filter === category ? 1 : 0.35}
              strokeWidth="6"
              pathLength="100"
              strokeDasharray={`${percent} ${100 - percent}`}
              strokeDashoffset={start}
              role="button"
              tabIndex={0}
              aria-label={`${category}: ${CURRENCY} ${formatAmount(amount)}`}
              aria-pressed={filter === category}
              onClick={() => toggle(category)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggle(category);
                }
              }}
            />
          );
        })}
        <text
          x="21"
          y="21"
          textAnchor="middle"
          dominantBaseline="middle"
          className="donut-total"
          fontSize={Math.min(4.5, 36 / total.length)}
        >
          {total}
        </text>
        <text x="21" y="26" textAnchor="middle" className="donut-currency">
          {CURRENCY}
        </text>
      </svg>
      <ul className="category-totals" aria-label="Category totals">
        {amounts.map(({ category, amount, percent }) => (
          <li key={category}>
            <button
              type="button"
              aria-label={`Filter ${category}`}
              aria-pressed={filter === category}
              onClick={() => toggle(category)}
            >
              <span className="category-label">
                <span
                  className="category-dot"
                  style={{ backgroundColor: CATEGORY_COLORS[category] }}
                />
                {category}
              </span>
              <span className="numeric">
                {CURRENCY} {formatAmount(amount)}
              </span>
              <span className="percentage">{Math.round(percent)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
