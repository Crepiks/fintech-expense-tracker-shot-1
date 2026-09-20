import { MAX_EXPENSES } from '../config';
import type { Category } from '../domain/categories';
import { applyRecurring } from '../domain/recurrence';
import type { Expense, RecurringCost, StoredData } from '../domain/types';

export type ExpenseAction =
  | { type: 'add' | 'restore'; expense: Expense }
  | { type: 'update'; expense: Expense }
  | { type: 'importExpenses'; expenses: Expense[] }
  | { type: 'remove'; id: string }
  | { type: 'replaceAll'; data: StoredData }
  | { type: 'setBudget'; minor: number | null }
  | { type: 'setStipendDay'; day: number | null }
  | { type: 'setCategoryLimit'; category: Category; minor: number | null }
  | { type: 'addRecurring'; cost: RecurringCost }
  | { type: 'removeRecurring'; id: string }
  | { type: 'applyRecurring'; today: string };

/** Consumes validated domain values; persistence and browser effects stay outside. */
export function expensesReducer(state: StoredData, action: ExpenseAction): StoredData {
  switch (action.type) {
    case 'add':
    case 'restore':
      if (state.expenses.length >= MAX_EXPENSES || state.expenses.some(item => item.id === action.expense.id)) return state;
      return { ...state, expenses: [...state.expenses, action.expense] };
    case 'update':
      if (!state.expenses.some(item => item.id === action.expense.id)) return state;
      return { ...state, expenses: state.expenses.map(item => item.id === action.expense.id ? action.expense : item) };
    case 'importExpenses': {
      if (!action.expenses.length || state.expenses.length + action.expenses.length > MAX_EXPENSES) return state;
      const ids = new Set(state.expenses.map(item => item.id));
      for (const item of action.expenses) {
        if (ids.has(item.id)) return state;
        ids.add(item.id);
      }
      return { ...state, expenses: [...state.expenses, ...action.expenses] };
    }
    case 'remove':
      return { ...state, expenses: state.expenses.filter(item => item.id !== action.id) };
    case 'replaceAll':
      return action.data;
    case 'setStipendDay':
      return { ...state, settings: { ...state.settings, stipendDay: action.day } };
    case 'setBudget':
      return { ...state, settings: { ...state.settings, monthlyBudgetMinor: action.minor } };
    case 'setCategoryLimit': {
      const categoryLimits = { ...state.settings.categoryLimits };
      if (action.minor === null) delete categoryLimits[action.category];
      else categoryLimits[action.category] = action.minor;
      return { ...state, settings: { ...state.settings, categoryLimits } };
    }
    case 'addRecurring': {
      const recurring = state.settings.recurring ?? [];
      if (recurring.length >= MAX_EXPENSES || recurring.some(item => item.id === action.cost.id)) return state;
      return { ...state, settings: { ...state.settings, recurring: [...recurring, action.cost] } };
    }
    case 'removeRecurring':
      return { ...state, settings: { ...state.settings, recurring: (state.settings.recurring ?? []).filter(item => item.id !== action.id) } };
    case 'applyRecurring':
      return applyRecurring(state, action.today);
  }
}
