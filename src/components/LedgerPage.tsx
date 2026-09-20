import { useMemo, useState } from 'react';
import { computeTotals } from '../domain/calc';
import { dateLabel } from '../domain/insights';
import { filterExpenses } from '../domain/search';
import { categoryTag, DISPLAY_CATEGORIES, money } from '../domain/presentation';
import { CATEGORY_COLORS, type Category } from '../domain/categories';
import type { Expense } from '../domain/types';
import { formatMonth } from '../domain/calendar';
import { ExpenseRows } from './ExpenseRows';
import { Icon } from './Icon';
import { MonthSwitcher } from './MonthSwitcher';

type Props = { expenses: Expense[]; month: string; today: string; budget: number | null; query: string; onQuery: (query: string) => void; onMonth: (month: string) => void; onEdit: (expense: Expense) => void; onImport: () => void; onExport: () => void };
export function LedgerPage({ expenses, month, today, budget, query, onQuery, onMonth, onEdit, onImport, onExport }: Props) {
  const [category, setCategory] = useState<Category | null>(null);
  const [previousExpenses, setPreviousExpenses] = useState(expenses);
  if (previousExpenses !== expenses) {
    setPreviousExpenses(expenses);
    // Reset only a category that lost its records, preserving deliberate empty filters.
    if (category && previousExpenses.some(item => item.category === category)
      && !expenses.some(item => item.category === category)) setCategory(null);
  }
  const filtered = useMemo(() => filterExpenses(expenses, query, month).filter(item => !category || item.category === category), [expenses, query, month, category]);
  const totals = computeTotals(filtered);
  const fixed = filtered.filter(item => item.fixed).reduce((sum, item) => sum + item.amountMinor, 0);
  const variable = filtered.filter(item => !item.fixed);
  const largest = variable.reduce<Expense | null>((max, item) => !max || item.amountMinor > max.amountMinor ? item : max, null);
  const groups = [...new Set(filtered.map(item => item.date))];
  const balance = new Map<string, number>();
  let spent = 0;
  [...expenses].reverse().forEach(expense => { spent += expense.amountMinor; balance.set(expense.id, (budget ?? 0) - spent); });
  return <section className="page ledger-page">
    <div className="page-heading"><div className="view-title"><h1>Ledger</h1><p className="eyebrow">{formatMonth(month)}<span className="desktop-only"> · NEWEST FIRST</span></p></div><strong className="mobile-only mono">{money(totals.totalMinor)}</strong><div className="desktop-only header-actions"><button className="outline-button" onClick={onImport}>import csv</button><button className="outline-button" onClick={onExport}>export csv</button></div></div>
    <div className="search-box"><Icon name="search" /><input aria-label="Filter expenses" placeholder="try: #fun >20 · note:lunch · sep 10..17" value={query} onChange={event => onQuery(event.target.value)} /><span>{filtered.length} entries</span></div>
    <div className="filter-chips"><button aria-label="Clear filter" aria-pressed={category === null} onClick={() => setCategory(null)}>all</button>{DISPLAY_CATEGORIES.map(item => <button key={item} aria-label={`Filter ${item}`} aria-pressed={category === item} style={{ '--category': CATEGORY_COLORS[item] } as React.CSSProperties} onClick={() => setCategory(category === item ? null : item)}>#{categoryTag(item)}</button>)}</div>
    <div className="stats ledger-stats desktop-only">
      <div><span className="eyebrow">ENTRIES</span><strong>{filtered.length}</strong><small>{category ? `#${categoryTag(category)}` : 'all categories'} · {month}</small></div>
      <div><span className="eyebrow">TOTAL</span><strong>{money(totals.totalMinor)}</strong><small>incl. {money(fixed)} fixed</small></div>
      <div><span className="eyebrow">AVG / ENTRY</span><strong>{money(variable.length ? Math.round((totals.totalMinor - fixed) / variable.length) : 0)}</strong><small>excl. fixed costs</small></div>
      <div><span className="eyebrow">LARGEST</span><strong>{largest ? money(largest.amountMinor) : '—'}</strong><small>{largest?.description || 'excl. fixed costs'}</small></div>
    </div>
    <div className="ledger-table">
      <div className="ledger-columns desktop-only eyebrow"><span>DATE</span><span>NOTE</span><span>CATEGORY</span><span>AMOUNT</span><span>BUDGET LEFT</span></div>
      {groups.map(date => {
        const items = filtered.filter(item => item.date === date);
        return <section className="ledger-group" key={date} aria-label={dateLabel(date)}><div className="ledger-group-heading"><span>{dateLabel(date)}{date === today ? ' · TODAY' : ''}</span><span>{money(computeTotals(items).totalMinor)}</span></div>
          <div className="mobile-only"><ExpenseRows expenses={items} onEdit={onEdit} /></div>
          <div className="desktop-only">{items.map(item => <button key={item.id} className="ledger-columns ledger-row" aria-label={`Edit ${item.description || item.category + ' expense'}`} onClick={() => onEdit(item)}><span className="muted">{dateLabel(date).split(' · ')[1]}</span><span className="ledger-note">{item.description || item.category}</span><span style={{ color: CATEGORY_COLORS[item.category] }}>#{categoryTag(item.category)}{item.fixed ? ' · fixed' : ''}</span><strong>{money(item.amountMinor)}</strong><span className="muted">{budget === null ? '—' : money(balance.get(item.id)!)}</span></button>)}</div>
        </section>;
      })}
      {filtered.length === 0 && <div className="empty-state"><h2>{expenses.length ? 'No matching expenses.' : `No expenses in ${formatMonth(month)} yet.`}</h2><p>{expenses.length ? 'Try another category or search.' : 'Tap + and type your first expense like a note.'}</p></div>}
    </div>
    <div className="ledger-utilities"><MonthSwitcher month={month} onChange={onMonth} /><div className="mobile-only"><button className="text-button" onClick={onImport}>import csv</button><button className="text-button" onClick={onExport}>export csv</button></div></div>
  </section>;
}
