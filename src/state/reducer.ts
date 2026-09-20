import { MAX_EXPENSES } from '../config';
import type { Expense, StoredData } from '../domain/types';

export type ExpenseAction =
  | { type: 'add' | 'restore'; expense: Expense }
  | { type: 'remove'; id: string }
  | { type: 'replaceAll'; data: StoredData }
  | { type: 'setBudget'; minor: number | null };

/** Consumes validated domain values; persistence and browser effects stay outside. */
export function expensesReducer(state: StoredData, action: ExpenseAction): StoredData {
  switch (action.type) {
    case 'add':
    case 'restore':
      if (state.expenses.length >= MAX_EXPENSES || state.expenses.some(item => item.id === action.expense.id)) return state;
      return { ...state, expenses: [...state.expenses, action.expense] };
    case 'remove':
      return { ...state, expenses: state.expenses.filter(item => item.id !== action.id) };
    case 'replaceAll':
      return action.data;
    case 'setBudget':
      return { ...state, settings: { monthlyBudgetMinor: action.minor } };
  }
}
