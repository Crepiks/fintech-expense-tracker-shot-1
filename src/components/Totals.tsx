import { CURRENCY } from '../config';
import { CATEGORIES, CATEGORY_COLORS } from '../domain/categories';
import type { TotalsData } from '../domain/calc';
import { formatAmount } from '../domain/money';

type Props = { totals: TotalsData; count: number };
export function Totals({ totals, count }: Props) {
  return <section className="panel totals-panel" aria-label="Monthly spending">
    <div className="summary-heading">
      <div>
        <p className="summary-label">Total spent</p>
        <p className="total-amount" aria-label="Total spent">{CURRENCY} {formatAmount(totals.totalMinor)}</p>
        <p className="muted count">{count} {count === 1 ? 'expense' : 'expenses'}</p>
      </div>
      <p className={totals.invariantOk ? 'invariant' : 'invariant error'}>
        <span aria-hidden="true">{totals.invariantOk ? '✓' : '!'}</span>
        {totals.invariantOk ? 'Categories = Total' : 'Totals need attention'}
      </p>
    </div>
    <ul className="category-totals" aria-label="Category totals">
      {CATEGORIES.map(category => <li key={category}>
        <span className="category-label"><span className="category-dot" style={{ backgroundColor: CATEGORY_COLORS[category] }} />{category}</span>
        <span className="numeric">{CURRENCY} {formatAmount(totals.byCategory[category])}</span>
        <span className="percentage">{totals.totalMinor === 0 ? 0 : Math.round(totals.byCategory[category] / totals.totalMinor * 100)}%</span>
      </li>)}
    </ul>
  </section>;
}
