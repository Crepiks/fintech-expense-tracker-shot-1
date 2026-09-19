import type { Expense, StoredData } from '../src/domain/types';

export const expense: Expense = { id: 'one', amountMinor: 150000, category: 'Food', date: '2026-09-01', createdAt: 1 };
export const data: StoredData = { version: 1, expenses: [expense], settings: { monthlyBudgetMinor: 500000 } };
export const empty: StoredData = { version: 1, expenses: [], settings: { monthlyBudgetMinor: null } };
