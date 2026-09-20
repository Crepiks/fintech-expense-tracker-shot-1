import { useEffect } from 'react';
import { CURRENCY } from '../config';
import { formatAmount } from '../domain/money';
import type { Expense } from '../domain/types';

type Props = { expense: Expense; onUndo: (expense: Expense) => void; onExpire: () => void };
export function UndoToast({ expense, onUndo, onExpire }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onExpire, 5000);
    return () => window.clearTimeout(timer);
  }, [expense, onExpire]);
  return (
    <div className="undo-toast" role="status">
      <span>
        {CURRENCY} {formatAmount(expense.amountMinor)} expense deleted.
      </span>
      <button type="button" onClick={() => onUndo(expense)}>
        Undo
      </button>
    </div>
  );
}
