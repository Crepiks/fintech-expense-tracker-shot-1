import { CURRENCY } from '../config';
import type { Category } from '../domain/categories';
import { CategoryDonut } from './CategoryDonut';
import type { TotalsData } from '../domain/calc';
import { formatAmount } from '../domain/money';

type Props = { totals: TotalsData; count: number; filter: Category | null; onFilter: (category: Category | null) => void };
export function Totals({ totals, count, filter, onFilter }: Props) {
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
    <CategoryDonut totals={totals} filter={filter} onFilter={onFilter} />
    {filter && <p className="filter-hint">Showing {filter} transactions. <button type="button" className="text-button" onClick={() => onFilter(null)}>Clear filter</button></p>}
  </section>;
}
