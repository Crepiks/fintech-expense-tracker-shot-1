import { useState } from 'react';
import { monthInsights, dateLabel, daysInMonth } from '../domain/insights';
import { formatMonth, shiftMonth, shiftDate } from '../domain/calendar';
import { computeTotals, expensesForMonth } from '../domain/calc';
import { money } from '../domain/presentation';
import type { Expense, StoredData } from '../domain/types';
import { CalendarGrid } from './CalendarGrid';
import { CategoryBars } from './CategoryBars';
import { ExpenseRows } from './ExpenseRows';

type Props = { month: string; today: string; allExpenses: Expense[]; settings: StoredData['settings']; selected: string; onSelect: (date: string) => void; onMonth: (month: string) => void; onAdd: (date: string) => void; onBudget: () => void; onEdit: (expense: Expense) => void };
export function CalendarPage({ month, today, allExpenses, settings, selected, onSelect, onMonth, onAdd, onBudget, onEdit }: Props) {
  const [period, setPeriod] = useState<'month' | 'week' | 'year'>('month');
  const expenses = expensesForMonth(allExpenses, month);
  const insights = monthInsights(expenses, month, today, settings.monthlyBudgetMinor, settings.recurring);
  const totals = computeTotals(expenses);
  const selectedExpenses = expenses.filter(expense => expense.date === selected);
  const selectedTotal = computeTotals(selectedExpenses).totalMinor;
  const difference = selectedExpenses.filter(item => !item.fixed).reduce((sum, item) => sum + item.amountMinor, 0) - insights.variableAverageMinor;
  const monthName = formatMonth(month);
  const title = period === 'year' ? month.slice(0, 4) : monthName;
  const first = period === 'year' ? month.startsWith('0001-') : period === 'week' ? selected === '0001-01-01' : month === '0001-01';
  const last = period === 'year' ? month.startsWith('9999-') : period === 'week' ? selected === '9999-12-31' : month === '9999-12';
  function selectDate(date: string) {
    if (date.slice(0, 7) !== month) onMonth(date.slice(0, 7));
    onSelect(date);
  }
  function navigate(delta: number) {
    if (period === 'week') {
      const next = shiftDate(selected, delta * 7);
      if (next.slice(0, 7) !== month) onMonth(next.slice(0, 7));
      onSelect(next);
    } else onMonth(shiftMonth(month, delta * (period === 'year' ? 12 : 1)));
  }
  return <div className="calendar-layout">
    <section className="calendar-main">
      <div className="page-heading calendar-heading">
        <div className="calendar-title"><button className="icon-button previous-month" aria-label={`Previous ${period}`} disabled={first} onClick={() => navigate(-1)}>‹</button><div><h1 aria-label={title}><span className="mobile-only">{title.split(' ')[0]}</span><span className="desktop-only">{title}</span></h1><p className="eyebrow">DAY {insights.elapsedDays}/{insights.days} · {expenses.length} ENTRIES</p></div><button className="icon-button next-month" aria-label={`Next ${period}`} disabled={last} onClick={() => navigate(1)}>›</button></div>
        <div className="period-picker" aria-label="Calendar view">{(['month', 'week', 'year'] as const).map(item => <button key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>)}</div>
      </div>
      <div className="stats calendar-stats">
        <div><span className="eyebrow">SPENT</span><strong aria-label="Total spent">{money(insights.totalMinor)}</strong><small>{settings.monthlyBudgetMinor ? `${Math.round(insights.totalMinor / settings.monthlyBudgetMinor * 100)}% of ${money(settings.monthlyBudgetMinor)}` : 'No monthly limit'}</small></div>
        <div><span className="eyebrow">LEFT</span><strong className="accent">{insights.remainingMinor === null ? '—' : money(insights.remainingMinor)}</strong><small>{insights.safePerDayMinor === null ? settings.monthlyBudgetMinor ? 'Current month only' : 'Set a budget' : `${money(insights.safePerDayMinor)}/day`}</small></div>
        <div className="mobile-only"><span className="eyebrow">PER DAY</span><strong>{insights.safePerDayMinor === null ? '—' : money(insights.safePerDayMinor)}</strong></div>
        <div className="desktop-only"><span className="eyebrow">VARIABLE AVG</span><strong>{money(insights.variableAverageMinor)}</strong><small>per day, excl. fixed</small></div>
        <div className="desktop-only"><span className="eyebrow">NO-SPEND DAYS</span><strong>{insights.noSpendDays}</strong><small>in elapsed days</small></div>
      </div>
      {period === 'year' ? <div className="year-grid">{Array.from({ length: 12 }, (_, index) => {
        const key = `${month.slice(0, 4)}-${String(index + 1).padStart(2, '0')}`;
        const list = expensesForMonth(allExpenses, key);
        return <button key={key} onClick={() => { onMonth(key); setPeriod('month'); }}><strong>{formatMonth(key).split(' ')[0]}</strong><span>{money(computeTotals(list).totalMinor)}</span><small>{list.length} entries · {daysInMonth(key)} days</small></button>;
      })}</div> : <CalendarGrid month={month} today={today} expenses={period === 'week' ? allExpenses : expenses} selected={selected} onSelect={selectDate} week={period === 'week'} />}
    </section>
    <aside className="calendar-sidebar">
      <section className="selected-day" aria-label="Selected day">
        <div className="day-summary"><div><p className="eyebrow">{dateLabel(selected)}{selected === today ? ' · TODAY' : ''}</p><h2>{money(selectedTotal)}</h2></div>{selectedExpenses.length > 0 && <span className={difference > 0 ? 'danger' : 'positive'}>{difference >= 0 ? '+' : '−'}{money(Math.abs(difference))} vs avg</span>}</div>
        <ExpenseRows expenses={selectedExpenses} onEdit={onEdit} />
        {selectedExpenses.length === 0 && <p className="empty-note">{selected > today ? '// nothing planned for this day.' : '// no expenses on this day.'}</p>}
        <button className="add-to-day" onClick={() => onAdd(selected)}>+ add to this day <span>{dateLabel(selected).split(' · ')[1]}</span></button>
      </section>
      <section className="month-categories"><div className="section-heading"><h2 className="eyebrow">MONTH BY CATEGORY</h2><button className="text-button" onClick={onBudget}>budget →</button></div><CategoryBars totals={totals.byCategory} limits={settings.categoryLimits ?? {}} /></section>
    </aside>
  </div>;
}
