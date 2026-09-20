import { useState } from 'react';
import type { Expense, StoredData } from '../domain/types';
import { CATEGORY_COLORS, type Category } from '../domain/categories';
import { categoryTag, DISPLAY_CATEGORIES, money, shortMoney } from '../domain/presentation';
import { computeTotals } from '../domain/calc';
import { dateLabel, monthInsights } from '../domain/insights';
import { formatMonth } from '../domain/calendar';
import { LimitInput } from './LimitInput';
import { SpendChart } from './SpendChart';
import { MonthSwitcher } from './MonthSwitcher';

type Props = { month: string; today: string; expenses: Expense[]; settings: StoredData['settings']; onBudget: (value: number | null) => void; onLimit: (category: Category, value: number | null) => void; onRepeat: () => void; onRemoveRepeat: (id: string) => void; onMonth: (month: string) => void; onSettings: () => void };
export function BudgetPage({ month, today, expenses, settings, onBudget, onLimit, onRepeat, onRemoveRepeat, onMonth, onSettings }: Props) {
  const [editing, setEditing] = useState(false);
  const insights = monthInsights(expenses, month, today, settings.monthlyBudgetMinor, settings.recurring);
  const totals = computeTotals(expenses);
  const limit = settings.monthlyBudgetMinor;
  const difference = (limit ?? 0) - insights.forecastMinor;
  const recurring = settings.recurring ?? [];
  const fixedExpenses = expenses.filter(expense => expense.fixed && !recurring.some(rule => rule.id === expense.recurringId));
  return <section className={`page budget-page ${editing ? 'editing-limits' : ''}`}>
    <div className="page-heading"><div className="view-title"><h1>Budget</h1><p className="eyebrow"><span className="desktop-only">{formatMonth(month)} · </span>{limit === null ? 'SET YOUR MONTHLY LIMIT' : <>LIMIT {shortMoney(limit)} · DAY {insights.elapsedDays}/{insights.days}</>}</p></div><div className="monthly-limit"><span className="eyebrow">MONTHLY LIMIT</span><LimitInput label="Monthly limit" value={limit} onSave={onBudget} /></div><button className="outline-button mobile-only" aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? 'done' : 'edit limits'}</button></div>
    <div className="budget-top">
      <section className="chart-panel desktop-only"><div className="section-heading"><h2 className="eyebrow">CUMULATIVE SPEND VS PACE</h2><div className="chart-legend"><span>━ actual</span><span>┄ pace</span><span>┈ forecast</span></div></div><SpendChart insights={insights} limit={limit} /></section>
      <section className="forecast-panel"><div className="forecast-heading"><div><h2 className="eyebrow">{insights.elapsedDays === insights.days ? 'MONTH TOTAL' : 'FORECAST'} · {dateLabel(`${month}-${insights.days}`).split(' · ')[1]}</h2><strong className="forecast-amount">{money(insights.forecastMinor)}</strong></div>{limit !== null && <span className={`forecast-badge ${difference < 0 ? 'over' : ''}`}>{money(Math.abs(difference))} {difference < 0 ? 'over' : 'under'}</span>}</div>
        <p className="forecast-copy">At your current pace of <span>{money(insights.variableAverageMinor)}/day</span>{limit === null ? ', set a monthly limit to plan ahead.' : <> you’ll finish <span className={difference < 0 ? 'danger' : 'positive'}>{money(Math.abs(difference))} {difference < 0 ? 'over' : 'under'}</span> your limit.</>}</p>
        <div className="mobile-only"><SpendChart insights={insights} limit={limit} compact /><div className="chart-dates"><span>{dateLabel(`${month}-01`).split(' · ')[1]}</span><span>spent {money(insights.totalMinor)}</span><span>{dateLabel(`${month}-${insights.days}`).split(' · ')[1]}</span></div></div>
        <dl className="forecast-details"><div><dt>safe to spend / day</dt><dd>{insights.safePerDayMinor === null ? '—' : money(insights.safePerDayMinor)}</dd></div><div><dt>pace line today</dt><dd>{insights.paceMinor === null ? '—' : money(insights.paceMinor)}</dd></div><div><dt>vs pace</dt><dd>{insights.paceMinor === null ? '—' : money(insights.actualPoints[insights.elapsedDays] - insights.paceMinor)}</dd></div></dl>
      </section>
    </div>
    <div className="budget-bottom"><section className="category-limits" aria-label="Category budgets"><div className="budget-columns budget-column-heading desktop-only eyebrow"><span>CATEGORY</span><span>SPENT · MARKER = TODAY’S PACE</span><span>SPENT</span><span>LIMIT</span><span>STATUS</span></div>
      {DISPLAY_CATEGORIES.map(category => {
        const cap = settings.categoryLimits?.[category] ?? null;
        const spent = totals.byCategory[category];
        const items = expenses.filter(item => item.category === category);
        const paid = items.length > 0 && items.every(item => item.fixed);
        const status = cap === null ? 'NO LIMIT' : spent > cap ? 'OVER' : paid ? 'PAID' : spent / cap > insights.elapsedDays / insights.days + .05 ? 'WATCH' : 'OK';
        return <div key={category} className={`budget-columns category-budget category-${categoryTag(category)}`}><span className="category-name" style={{ color: CATEGORY_COLORS[category] }}>#{categoryTag(category)}</span><div className="track"><span style={{ background: CATEGORY_COLORS[category], width: `${cap === null ? 0 : Math.min(100, spent / cap * 100)}%` }} />{!paid && <i style={{ left: `${insights.elapsedDays / insights.days * 100}%` }} />}</div><span className="category-spent">{money(spent)} <span className="mobile-only muted">/ {cap === null ? '—' : shortMoney(cap)}</span></span><LimitInput label={`Limit for ${categoryTag(category)}`} value={cap} onSave={value => onLimit(category, value)} /><span className={`category-status ${status === 'OVER' || status === 'WATCH' ? 'danger' : status === 'OK' ? 'positive' : 'muted'}`}>{status}</span></div>;
      })}
    </section><section className="fixed-costs"><h2 className="eyebrow">FIXED COSTS</h2>{recurring.map(rule => <div className="fixed-cost" key={rule.id}><span className="fixed-swatch fixed-day" /><div><strong>{rule.description}</strong><small>#{categoryTag(rule.category)} · monthly · day {rule.day}</small></div><span>{money(rule.amountMinor)}</span><button className="text-button danger" aria-label={`Stop repeating ${rule.description}`} onClick={() => onRemoveRepeat(rule.id)}>stop</button></div>)}
      {fixedExpenses.map(expense => <div className="fixed-cost" key={expense.id}><span className="fixed-swatch fixed-day" /><div><strong>{expense.description || expense.category}</strong><small>#{categoryTag(expense.category)} · fixed · {dateLabel(expense.date).split(' · ')[1]}</small></div><span>{money(expense.amountMinor)}</span></div>)}
      <button className="repeat-hint" onClick={onRepeat}><span>Add another from the command bar:</span><code>/repeat phone 25 monthly #other</code></button><p className="empty-note">// fixed costs are drawn hatched on the calendar and left out of the daily average.</p></section></div>
    <div className="budget-footer"><span className="empty-note">// marker = where you’d be on pace today</span><button className="text-button" onClick={onSettings}>settings</button><MonthSwitcher month={month} onChange={onMonth} /></div>
  </section>;
}
