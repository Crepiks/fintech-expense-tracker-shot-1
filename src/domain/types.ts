import type { Category } from './categories';

export type Expense = {
  id: string;
  amountMinor: number;
  category: Category;
  date: string;
  description?: string;
  createdAt: number;
};
export type StoredData = {
  version: 1;
  expenses: Expense[];
  settings: { monthlyBudgetMinor: number | null; stipendDay: number | null };
};
export type ExpenseDraft = {
  amount: string;
  category: string;
  date: string;
  description?: string;
};
export type ExpenseValue = Omit<Expense, 'id' | 'createdAt'>;
