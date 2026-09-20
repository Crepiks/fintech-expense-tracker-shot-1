import { CURRENCY } from '../config';
import { CATEGORY_COLORS, type Category } from '../domain/categories';
import { formatDate, formatMonth } from '../domain/calendar';
import { formatAmount } from '../domain/money';
import type { Expense } from '../domain/types';
import { EmptyState } from './EmptyState';

type Props = { expenses: Expense[]; month: string; onDelete: (expense: Expense) => void; categoryFilter?: Category | null };
export function ExpenseList({ expenses, month, onDelete, categoryFilter = null }: Props) {
  const visible = categoryFilter ? expenses.filter(expense => expense.category === categoryFilter) : expenses;
  return <section className="panel transactions" aria-labelledby="transactions-title">
    <h2 id="transactions-title">Transactions</h2>
    {visible.length === 0 ? (categoryFilter ? <p className="empty-state">No {categoryFilter} expenses in {formatMonth(month)}.</p> : <EmptyState month={month} />) : <div className="table-scroll">
      <table>
        <caption className="sr-only">Expenses for the selected month</caption>
        <thead><tr><th>Date</th><th>Category</th><th>Description</th><th className="numeric">Amount</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{visible.map(expense => <tr key={expense.id}>
          <td><time dateTime={expense.date}>{formatDate(expense.date)}</time></td>
          <td><span className="category-label"><span className="category-dot" style={{ backgroundColor: CATEGORY_COLORS[expense.category] }} />{expense.category}</span></td>
          <td className="description">{expense.description || <span className="muted">No description</span>}</td>
          <td className="numeric">{CURRENCY} {formatAmount(expense.amountMinor)}</td>
          <td><button type="button" className="delete-button" aria-label="Delete expense" onClick={() => onDelete(expense)}>Delete</button></td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>;
}
