import type { Category } from './categories';

export type Expense = {
  id: string;
  amountMinor: number;
  category: Category;
  date: string;
  description?: string;
  createdAt: number;
  fixed?: boolean;
  recurringId?: string;
};
export type RecurringCost = {
  id: string;
  description: string;
  amountMinor: number;
  category: Category;
  day: number;
  startDate: string;
  lastAppliedMonth: string | null;
};
export type StoredData = {
  version: 1;
  expenses: Expense[];
  settings: {
    monthlyBudgetMinor: number | null;
    stipendDay: number | null;
    categoryLimits?: Partial<Record<Category, number>>;
    recurring?: RecurringCost[];
  };
};
export type ExpenseDraft = {
  amount: string;
  category: string;
  date: string;
  description?: string;
};
export type ExpenseValue = Omit<Expense, 'id' | 'createdAt'>;
