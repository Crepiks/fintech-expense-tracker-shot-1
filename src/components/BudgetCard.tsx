import { useEffect, useState, type FormEvent } from 'react';
import { CURRENCY } from '../config';
import { computeBudget, nextStipend } from '../domain/budget';
import { formatDate, formatMonth } from '../domain/calendar';
import { formatAmount, parseAmount } from '../domain/money';

type Props = {
  budgetMinor: number | null;
  spentMinor: number;
  reservedMinor?: number;
  month: string;
  today: string;
  onSave: (minor: number | null) => void;
  stipendDay: number | null;
  onStipendSave: (day: number | null) => void;
};
export function BudgetCard({
  budgetMinor,
  spentMinor,
  reservedMinor = 0,
  month,
  today,
  onSave,
  stipendDay,
  onStipendSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [stipendInput, setStipendInput] = useState('');
  const [stipendError, setStipendError] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setInput(budgetMinor === null ? '' : formatAmount(budgetMinor));
  }, [budgetMinor]);
  useEffect(() => {
    setStipendInput(stipendDay === null ? '' : String(stipendDay));
  }, [stipendDay]);
  const stipend = stipendDay === null ? null : nextStipend(today, stipendDay);
  const budget = computeBudget(budgetMinor, spentMinor, month, today, reservedMinor);

  function submit(event: FormEvent) {
    event.preventDefault();
    setNotice('');
    const day = stipendInput.trim() === '' ? null : Number(stipendInput);
    if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) {
      setStipendError('Choose a whole day from 1 to 31, or leave empty.');
      return;
    }
    setStipendError('');
    const result = input.trim() ? parseAmount(input) : { ok: true as const, minor: null };
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSave(result.minor);
    onStipendSave(day);
    setError('');
    setEditing(false);
    setNotice(result.minor === null ? 'Budget cleared.' : 'Budget saved.');
  }
  return (
    <section className="panel budget-panel" aria-labelledby="budget-title">
      <div className="budget-heading">
        <h2 id="budget-title">Monthly budget</h2>
        <span>{formatMonth(month)}</span>
      </div>
      {budget && budgetMinor !== null ? (
        <>
          <p className="budget-amount" aria-label="Budget amount">
            {CURRENCY} {formatAmount(budgetMinor)}
          </p>
          <div className="budget-stats">
            <div>
              <strong aria-label="Budget spent">
                {CURRENCY} {formatAmount(spentMinor)}
              </strong>
              <span>Spent</span>
            </div>
            <div className={budget.overBudget ? 'over-budget' : ''}>
              {budget.overBudget ? (
                <strong>
                  Over by {CURRENCY} {formatAmount(-budget.remainingMinor)}
                </strong>
              ) : (
                <strong aria-label="Budget remaining">
                  {CURRENCY} {formatAmount(budget.remainingMinor)}
                </strong>
              )}
              <span>{budget.overBudget ? 'Over budget' : 'Remaining'}</span>
            </div>
          </div>
          <div
            className="budget-progress"
            role="progressbar"
            aria-label="Monthly budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(budget.progress)}
          >
            <span
              className={
                budget.overBudget ? 'over-budget' : budget.pctUsed >= 80 ? 'budget-warning' : ''
              }
              style={{ width: `${budget.progress}%` }}
            />
          </div>
          <p className="budget-help">{Math.round(budget.pctUsed)}% used</p>
          {budget.remainingMinor > reservedMinor && budget.safePerDayMinor !== null && (
            <div className="daily-budget">
              <p>
                Safe to spend today: {CURRENCY} {formatAmount(budget.safePerDayMinor)}
              </p>
              <span>Across {budget.daysLeft} days, including today.</span>
            </div>
          )}
        </>
      ) : (
        <p className="budget-empty">Give your spending a little direction.</p>
      )}
      {stipend && (
        <p className="budget-help">
          {stipend.daysUntil === 0
            ? 'Stipend day is today'
            : `Stipend in ${stipend.daysUntil} days (${formatDate(stipend.date)})`}
        </p>
      )}
      {budgetMinor !== null && !editing && (
        <button
          type="button"
          className="text-button"
          onClick={() => setEditing(true)}
          aria-label="Edit budget settings"
        >
          Edit
        </button>
      )}
      {(editing || budgetMinor === null) && (
        <form onSubmit={submit} noValidate aria-label="Set monthly budget">
          <label htmlFor="budget-input">Monthly budget ({CURRENCY})</label>
          <div className="budget-input-row">
            <input
              id="budget-input"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 5,000"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby="budget-error budget-help"
            />
            <button className="outline-button" type="submit">
              Save budget
            </button>
          </div>
          <label htmlFor="stipend-input">Stipend day (optional)</label>
          <input
            id="stipend-input"
            type="number"
            min="1"
            max="31"
            step="1"
            value={stipendInput}
            onChange={(event) => setStipendInput(event.target.value)}
            aria-invalid={Boolean(stipendError)}
            aria-describedby="stipend-error"
          />
          <p id="stipend-error" className="field-error" aria-live="polite">
            {stipendError}
          </p>
          <p id="budget-error" className="field-error" aria-live="polite">
            {error}
          </p>
          <p id="budget-help" className="budget-help">
            One limit for every month. Leave empty to clear.
          </p>
        </form>
      )}
      <p className="save-hint" role="status">
        {notice}
      </p>
    </section>
  );
}
