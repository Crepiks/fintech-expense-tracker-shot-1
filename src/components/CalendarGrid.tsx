import { Fragment } from 'react';
import type { Expense } from '../domain/types';
import { calendarCells, calendarShade, dateLabel } from '../domain/insights';
import { CATEGORY_COLORS } from '../domain/categories';
import { money } from '../domain/presentation';
import { formatDate } from '../domain/calendar';

type Props = { month: string; today: string; expenses: Expense[]; selected: string; onSelect: (date: string) => void; week: boolean };
export function CalendarGrid({ month, today, expenses, selected, onSelect, week }: Props) {
  const allCells = calendarCells(month);
  const selectedIndex = allCells.findIndex(cell => cell.date === selected);
  const cells = week ? allCells.slice(Math.floor(selectedIndex / 7) * 7, Math.floor(selectedIndex / 7) * 7 + 7) : allCells;
  const byDate = new Map<string, Expense[]>();
  for (const expense of expenses) byDate.set(expense.date, [...(byDate.get(expense.date) ?? []), expense]);
  return <div className={`calendar-grid-wrap ${week ? 'week-view' : ''}`}>
    <div className="calendar-weekdays">{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => <span key={day}><span className="desktop-only">{day}</span><span className="mobile-only">{day[0]}</span></span>)}<span className="week-total">WEEK</span></div>
    <div className="calendar-grid">
      {cells.map((cell, index) => {
        const items = byDate.get(cell.date) ?? [];
        const variable = items.reduce((sum, item) => sum + (item.fixed ? 0 : item.amountMinor), 0);
        const fixed = items.some(item => item.fixed);
        const future = cell.date > today;
        const categories = [...new Set(items.map(item => item.category))];
        const weekTotal = cells.slice(index - 6, index + 1).reduce((sum, day) => sum + (byDate.get(day.date) ?? []).reduce((total, expense) => total + expense.amountMinor, 0), 0);
        return <Fragment key={index}>
          {cell.inMonth || (week && Boolean(cell.date)) ? <button className={`calendar-day shade-${calendarShade(variable)} ${fixed ? 'fixed-day' : ''} ${future && !items.length ? 'future-day' : ''}`} aria-label={`${new Date(cell.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, ${money(items.reduce((sum, item) => sum + item.amountMinor, 0))}`} aria-pressed={selected === cell.date} aria-current={cell.date === today ? 'date' : undefined} onClick={() => onSelect(cell.date)}>
            <span className="day-top"><span>{cell.day}</span><small>{fixed ? 'FIXED' : cell.date === today ? 'TODAY' : ''}</small></span>
            <span className="day-bottom"><span className="desktop-only">{variable ? money(variable) : future ? '' : '—'}</span><span className="mobile-only">{variable ? Math.round(variable / 100).toLocaleString('en-US') : future ? '' : '—'}</span><span className="day-dots">{categories.slice(0, 4).map(category => <i key={category} style={{ background: CATEGORY_COLORS[category] }} />)}</span></span>
            {week && <span className="week-day-label">{dateLabel(cell.date)}</span>}
          </button> : <span className="calendar-pad" aria-label={cell.date ? formatDate(cell.date) : undefined}>{cell.day || ''}</span>}
          {(index + 1) % 7 === 0 && <div className="week-total"><strong>{weekTotal ? money(weekTotal) : '—'}</strong><span>{cell.date > today ? 'ahead' : 'total'}</span></div>}
        </Fragment>;
      })}
    </div>
    <div className="calendar-legend"><span>less</span>{[0, 1, 2, 3, 4].map(shade => <i className={`shade-${shade}`} key={shade} />)}<span>more</span><i className="fixed-day" /><span>fixed cost</span></div>
  </div>;
}
