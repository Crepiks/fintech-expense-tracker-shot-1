import { useRef, useState, type FormEvent } from 'react';
import { CURRENCY } from '../config';
import { CATEGORIES } from '../domain/categories';
import { monthKey, todayLocal } from '../domain/calc';
import { formatMonth } from '../domain/calendar';
import { validateExpense, type ExpenseErrors } from '../domain/validation';
import type { ExpenseValue } from '../domain/types';

type Props = {
  today?: string;
  selectedMonth: string;
  onAdd: (value: ExpenseValue) => void;
  onMonthChange: (month: string) => void;
  canAdd: boolean;
};
export function ExpenseForm({
  selectedMonth,
  onAdd,
  onMonthChange,
  canAdd,
  today = todayLocal(),
}: Props) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<ExpenseErrors>({});
  const [savedMonth, setSavedMonth] = useState<string | null>(null);
  const amountInput = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdd) return;
    const result = validateExpense({ amount, category, date, description }, today);
    if (!result.ok) {
      setErrors(result.errors);
      const field = result.errors.amount ? 'amount' : result.errors.category ? 'category' : 'date';
      (event.currentTarget.elements.namedItem(field) as HTMLElement).focus();
      return;
    }
    onAdd(result.value);
    setErrors({});
    setAmount('');
    setDescription('');
    setSavedMonth(monthKey(date));
    amountInput.current!.focus();
  }

  return (
    <section className="panel form-panel" aria-labelledby="expense-form-title">
      <h2 id="expense-form-title">Add an expense</h2>
      <form aria-label="Add an expense" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="amount">Amount ({CURRENCY})</label>
          <input
            id="amount"
            name="amount"
            ref={amountInput}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby="amount-error"
          />
          <span id="amount-error" className="field-error" aria-live="polite">
            {errors.amount}
          </span>
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-invalid={Boolean(errors.category)}
            aria-describedby="category-error"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <span id="category-error" className="field-error" aria-live="polite">
            {errors.category}
          </span>
        </div>
        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            name="date"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={Boolean(errors.date)}
            aria-describedby="date-error date-warning"
          />
          <span id="date-error" className="field-error" aria-live="polite">
            {errors.date}
          </span>
          <span id="date-warning" className="field-hint" aria-live="polite">
            {date > today ? 'This date is in the future.' : ''}
          </span>
        </div>
        <div className="field">
          <label htmlFor="description">Description (optional)</label>
          <input
            id="description"
            name="description"
            type="text"
            maxLength={200}
            placeholder="e.g. Grocery shopping"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <button className="primary-button" type="submit" disabled={!canAdd}>
          Add an expense
        </button>
        {!canAdd && (
          <p className="field-error">
            You have reached 10,000 expenses. Delete a record before adding another.
          </p>
        )}
        <div className="save-hint" role="status">
          {savedMonth &&
            (savedMonth === selectedMonth ? (
              'Expense added.'
            ) : (
              <>
                Saved to {formatMonth(savedMonth)}.{' '}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onMonthChange(savedMonth)}
                >
                  View {formatMonth(savedMonth)}
                </button>
              </>
            ))}
        </div>
      </form>
    </section>
  );
}
