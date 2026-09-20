import type { Expense } from '../domain/types';
import { CATEGORY_COLORS } from '../domain/categories';
import { categoryTag, money } from '../domain/presentation';
export function ExpenseRows({ expenses, onEdit }: { expenses: Expense[]; onEdit: (expense: Expense) => void }) {
  return <div className="expense-rows">{expenses.map(expense => <button key={expense.id} className="expense-row" aria-label={`Edit ${expense.description || expense.category + ' expense'}`} onClick={() => onEdit(expense)}>
    <span className="category-dot" style={{ background: CATEGORY_COLORS[expense.category] }} />
    <span className="expense-note"><span>{expense.description || expense.category}</span><span className="tag" style={{ color: CATEGORY_COLORS[expense.category] }}>#{categoryTag(expense.category)}{expense.fixed ? ' · fixed' : ''}</span></span>
    <strong className="mono">{money(expense.amountMinor)}</strong>
  </button>)}</div>;
}
