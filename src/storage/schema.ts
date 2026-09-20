import { MAX_AMOUNT_MINOR, MAX_EXPENSES } from '../config';
import { isCategory } from '../domain/categories';
import { isValidDate } from '../domain/validation';
import type { Expense, RecurringCost, StoredData } from '../domain/types';

export function emptyData(): StoredData {
  return { version: 1, expenses: [], settings: { monthlyBudgetMinor: null, stipendDay: null } };
}
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validMinor(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_AMOUNT_MINOR;
}
function readExpense(value: unknown): Expense | null {
  if (!isObject(value) || typeof value.id !== 'string' || !value.id.trim()
    || !validMinor(value.amountMinor) || !isCategory(value.category)
    || typeof value.date !== 'string' || !isValidDate(value.date)
    || typeof value.createdAt !== 'number' || !Number.isSafeInteger(value.createdAt) || value.createdAt < 0
    || (value.description !== undefined && typeof value.description !== 'string')
    || (value.fixed !== undefined && typeof value.fixed !== 'boolean')
    || (value.recurringId !== undefined && (typeof value.recurringId !== 'string' || !value.recurringId.trim()))) return null;
  const expense: Expense = {
    id: value.id, amountMinor: value.amountMinor, category: value.category,
    date: value.date, createdAt: value.createdAt,
  };
  if (typeof value.description === 'string') expense.description = value.description.trim().slice(0, 200);
  if (typeof value.fixed === 'boolean') expense.fixed = value.fixed;
  if (typeof value.recurringId === 'string') expense.recurringId = value.recurringId;
  return expense;
}

function readRecurring(value: unknown): RecurringCost | null {
  if (!isObject(value) || typeof value.id !== 'string' || !value.id.trim()
    || typeof value.description !== 'string' || !value.description.trim()
    || !validMinor(value.amountMinor) || !isCategory(value.category)
    || typeof value.day !== 'number' || !Number.isInteger(value.day) || value.day < 1 || value.day > 31
    || typeof value.startDate !== 'string' || !isValidDate(value.startDate)
    || (value.lastAppliedMonth !== null && (typeof value.lastAppliedMonth !== 'string'
      || !isValidDate(`${value.lastAppliedMonth}-01`)))) return null;
  return {
    id: value.id, description: value.description.trim().slice(0, 200),
    amountMinor: value.amountMinor, category: value.category, day: value.day,
    startDate: value.startDate, lastAppliedMonth: value.lastAppliedMonth,
  };
}

/** Validate untrusted persisted data, preserving every usable unique record. */
export function parseStoredData(raw: string | null): { data: StoredData; recovered: boolean } {
  if (raw === null) return { data: emptyData(), recovered: false };
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { return { data: emptyData(), recovered: true }; }
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.expenses)) {
    return { data: emptyData(), recovered: true };
  }
  let recovered = false;
  const data = emptyData();
  const ids = new Set<string>();
  for (const item of value.expenses) {
    const expense = readExpense(item);
    if (!expense || ids.has(expense.id) || data.expenses.length >= MAX_EXPENSES) {
      recovered = true;
      continue;
    }
    ids.add(expense.id);
    data.expenses.push(expense);
  }
  // Missing fields are version-1 legacy data, not corruption.
  if (value.settings !== undefined) {
    if (!isObject(value.settings)) recovered = true;
    else {
      const { monthlyBudgetMinor, stipendDay } = value.settings;
      if (monthlyBudgetMinor !== undefined && monthlyBudgetMinor !== null) {
        if (validMinor(monthlyBudgetMinor)) data.settings.monthlyBudgetMinor = monthlyBudgetMinor;
        else recovered = true;
      }
      if (stipendDay !== undefined && stipendDay !== null) {
        if (typeof stipendDay === 'number' && Number.isInteger(stipendDay) && stipendDay >= 1 && stipendDay <= 31) data.settings.stipendDay = stipendDay;
        else recovered = true;
      }
      if (value.settings.categoryLimits !== undefined) {
        if (!isObject(value.settings.categoryLimits)) recovered = true;
        else {
          data.settings.categoryLimits = {};
          for (const [category, limit] of Object.entries(value.settings.categoryLimits)) {
            if (isCategory(category) && validMinor(limit)) data.settings.categoryLimits[category] = limit;
            else recovered = true;
          }
        }
      }
      if (value.settings.recurring !== undefined) {
        if (!Array.isArray(value.settings.recurring)) recovered = true;
        else {
          data.settings.recurring = [];
          const recurringIds = new Set<string>();
          for (const item of value.settings.recurring) {
            const rule = readRecurring(item);
            if (!rule || recurringIds.has(rule.id) || data.settings.recurring.length >= MAX_EXPENSES) {
              recovered = true;
              continue;
            }
            recurringIds.add(rule.id);
            data.settings.recurring.push(rule);
          }
        }
      }
    }
  }
  return { data, recovered };
}
