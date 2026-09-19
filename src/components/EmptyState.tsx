import { formatMonth } from '../domain/calendar';

export function EmptyState({ month }: { month: string }) {
  return <div className="empty-state">
    <span className="empty-mark" aria-hidden="true">＋</span>
    <h3>No expenses in {formatMonth(month)} yet.</h3>
    <p>Start with a coffee, a commute, or whatever today brings.</p>
  </div>;
}
