import { useEffect, useState, type FormEvent } from 'react';
import { CURRENCY } from '../config';
import { computeBudget } from '../domain/budget';
import { formatMonth } from '../domain/calendar';
import { formatAmount, parseAmount } from '../domain/money';

type Props = { budgetMinor: number | null; spentMinor: number; month: string; today: string; onSave: (minor: number | null) => void };
export function BudgetCard({ budgetMinor, spentMinor, month, today, onSave }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { setInput(budgetMinor === null ? '' : formatAmount(budgetMinor)); }, [budgetMinor]);
  const budget = computeBudget(budgetMinor, spentMinor, month, today);

  function submit(event: FormEvent) {
    event.preventDefault();
    setNotice('');
    if (!input.trim()) {
      onSave(null);
      setError('');
      setNotice('Budget cleared.');
      return;
    }
    const result = parseAmount(input);
    if (!result.ok) { setError(result.error); return; }
    onSave(result.minor);
    setError('');
    setNotice('Budget saved.');
  }
  return <section className="panel budget-panel" aria-labelledby="budget-title">
    <div className="budget-heading"><h2 id="budget-title">Monthly budget</h2><span>{formatMonth(month)}</span></div>
    {budget && budgetMinor !== null ? <>
      <p className="budget-amount" aria-label="Budget amount">{CURRENCY} {formatAmount(budgetMinor)}</p>
      <div className="budget-stats">
        <div><strong aria-label="Budget spent">{CURRENCY} {formatAmount(spentMinor)}</strong><span>Spent</span></div>
        <div className={budget.overBudget ? 'over-budget' : ''}>
          {budget.overBudget ? <strong>Over by {CURRENCY} {formatAmount(-budget.remainingMinor)}</strong> : <strong aria-label="Budget remaining">{CURRENCY} {formatAmount(budget.remainingMinor)}</strong>}
          <span>{budget.overBudget ? 'Over budget' : 'Remaining'}</span>
        </div>
      </div>
      <div className="budget-progress" role="progressbar" aria-label="Monthly budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(budget.progress)}>
        <span className={budget.overBudget ? 'over-budget' : ''} style={{ width: `${budget.progress}%` }} />
      </div>
      {budget.safePerDayMinor !== null && <div className="daily-budget">
        <p>Safe to spend today: {CURRENCY} {formatAmount(budget.safePerDayMinor)}</p>
        <span>Across {budget.daysLeft} days, including today.</span>
      </div>}
    </> : <p className="budget-empty">Give your spending a little direction.</p>}
    <form onSubmit={submit} noValidate aria-label="Set monthly budget">
      <label htmlFor="budget-input">Monthly budget ({CURRENCY})</label>
      <div className="budget-input-row">
        <input id="budget-input" type="text" inputMode="decimal" placeholder="e.g. 5,000" value={input}
          onChange={event => setInput(event.target.value)} aria-invalid={Boolean(error)} aria-describedby="budget-error budget-help" />
        <button className="outline-button" type="submit">Save budget</button>
      </div>
      <p id="budget-error" className="field-error" aria-live="polite">{error}</p>
      <p id="budget-help" className="budget-help">One limit for every month. Leave empty to clear.</p>
      <p className="save-hint" role="status">{notice}</p>
    </form>
  </section>;
}
