import { useState, type FormEvent } from 'react';
import type { Expense, ExpenseValue } from '../domain/types';
import { CATEGORIES } from '../domain/categories';
import { inputMoney } from '../domain/presentation';
import { validateExpense, type ExpenseErrors } from '../domain/validation';
import { Modal } from './Modal';
export function ExpenseEditor({
  expense,
  today,
  onSave,
  onDelete,
  onClose,
}: {
  expense: Expense;
  today: string;
  onSave: (value: ExpenseValue) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(inputMoney(expense.amountMinor));
  const [category, setCategory] = useState<string>(expense.category);
  const [date, setDate] = useState(expense.date);
  const [description, setDescription] = useState(expense.description ?? '');
  const [fixed, setFixed] = useState(!!expense.fixed);
  const [errors, setErrors] = useState<ExpenseErrors>({});
  function save(event: FormEvent) {
    event.preventDefault();
    const result = validateExpense({ amount, category, date, description }, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSave({ ...result.value, fixed });
  }
  return (
    <Modal title="Edit expense" onClose={onClose}>
      <div className="dialog-heading">
        <h2>Edit expense</h2>
        <button className="text-button" onClick={onClose}>
          cancel
        </button>
      </div>
      <form className="edit-form" onSubmit={save} noValidate>
        <label>
          Amount (USD)
          <input
            autoFocus
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={!!errors.amount}
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={!!errors.date}
          />
        </label>
        <label>
          Description (optional)
          <input
            maxLength={200}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={fixed}
            onChange={(event) => setFixed(event.target.checked)}
          />
          Fixed cost (exclude from daily average)
        </label>
        {Object.values(errors).map((error) => (
          <p role="alert" className="field-error" key={error}>
            {error}
          </p>
        ))}
        {date > today && <p className="field-hint">This date is in the future.</p>}
        <div className="dialog-actions">
          <button type="button" className="text-button danger" onClick={onDelete}>
            Delete expense
          </button>
          <button className="primary-button" type="submit">
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
