import { MAX_EXPENSES } from '../config';
import { shiftMonth } from './calendar';
import type { Category } from './categories';
import { daysInMonth } from './insights';
import type { Expense, StoredData } from './types';

export type DemoResult = { added: number; error: string };
type Sample = [
  day: number,
  description: string,
  amountMinor: number,
  category: Category,
  fixed?: boolean,
];

// Keep this version's ordering stable: the index is part of each persistent demo ID.
const SAMPLES: Sample[] = [
  [1, 'Apartment rent', 75000, 'Housing', true],
  [1, 'Neighborhood groceries', 4260, 'Food'],
  [2, 'Monthly transit pass', 4500, 'Transportation', true],
  [2, 'Morning espresso', 380, 'Food'],
  [3, 'Campus lunch', 1250, 'Food'],
  [3, 'Design workbook', 2400, 'Study'],
  [4, 'Gym membership', 3200, 'Health', true],
  [5, 'Farmers market', 2875, 'Food'],
  [5, 'Movie night', 1600, 'Fun'],
  [6, 'Noodles with friends', 2240, 'Food'],
  [8, 'Fresh fruit & pantry staples', 3650, 'Food'],
  [8, 'Bus to the library', 250, 'Transportation'],
  [9, 'Notebook & pens', 1180, 'Study'],
  [9, 'Coffee between classes', 450, 'Food'],
  [10, 'Internet bill', 3500, 'Housing', true],
  [10, 'Lunch at the deli', 1375, 'Food'],
  [11, 'Pharmacy essentials', 1860, 'Health'],
  [12, 'Museum afternoon', 1200, 'Fun'],
  [12, 'Weekend groceries', 4830, 'Food'],
  [13, 'Bike-share ride', 600, 'Transportation'],
  [15, 'Cloud storage', 299, 'Other', true],
  [15, 'Lunch with Aida', 1850, 'Food'],
  [16, 'Course materials', 3400, 'Study'],
  [17, 'Bakery breakfast', 720, 'Food'],
  [17, 'Train across town', 850, 'Transportation'],
  [18, 'Live music at the café', 2200, 'Fun'],
  [19, 'Weekly grocery shop', 5175, 'Food'],
  [20, 'Sunday brunch', 2150, 'Food'],
  [20, 'Household supplies', 1640, 'Other'],
  [22, 'Phone plan', 2500, 'Other', true],
  [22, 'Salad & iced tea', 1490, 'Food'],
  [23, 'Secondhand novel', 950, 'Study'],
  [24, 'Yoga class', 1500, 'Health'],
  [24, 'Coffee on the way home', 420, 'Food'],
  [26, 'Dinner with friends', 3260, 'Food'],
  [26, 'Ride home', 1420, 'Transportation'],
  [27, 'Grocery top-up', 2730, 'Food'],
  [28, 'Weekend exhibition', 1800, 'Fun'],
  [30, 'Electricity bill', 4200, 'Housing', true],
  [31, 'Lunch at the market', 1280, 'Food'],
];

function monthExpenses(month: string, today: string): Expense[] {
  const lastDay = daysInMonth(month);
  const variation = 100 + ((Number(month.slice(5)) % 3) - 1) * 4;
  return SAMPLES.map(([day, description, amountMinor, category, fixed = false], index) => {
    const date = `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
    return {
      id: `demo:v1:${month}:${index}`,
      date,
      description,
      category,
      fixed,
      amountMinor: fixed ? amountMinor : Math.round((amountMinor * variation) / 100),
      createdAt: Math.max(0, Date.parse(`${date}T12:00:00Z`)) + index,
    };
  }).filter((expense) => expense.fixed || expense.date <= today);
}

/** Append a deterministic sample set for validated app dates, preserving existing IDs and settings. */
export function prepareDemoData(
  state: StoredData,
  month: string,
  today: string,
): DemoResult & { data: StoredData } {
  const months = new Set([shiftMonth(month, -2), shiftMonth(month, -1), month]);
  const ids = new Set(state.expenses.map((expense) => expense.id));
  const additions = [...months]
    .flatMap((value) => monthExpenses(value, today))
    .filter((expense) => !ids.has(expense.id));
  if (!additions.length) return { data: state, added: 0, error: '' };
  if (state.expenses.length + additions.length > MAX_EXPENSES) {
    return {
      data: state,
      added: 0,
      error: `Demo data needs room for ${additions.length} expenses. The 10,000-record limit would be exceeded. No data was changed.`,
    };
  }
  const { settings } = state;
  const pristine =
    state.expenses.length === 0 &&
    settings.monthlyBudgetMinor === null &&
    settings.stipendDay === null &&
    Object.keys(settings.categoryLimits ?? {}).length === 0 &&
    (settings.recurring ?? []).length === 0;
  return {
    added: additions.length,
    error: '',
    data: {
      ...state,
      expenses: [...state.expenses, ...additions],
      settings: pristine
        ? {
            ...settings,
            monthlyBudgetMinor: 180000,
            categoryLimits: {
              Food: 40000,
              Transportation: 10000,
              Housing: 85000,
              Study: 10000,
              Fun: 12000,
              Health: 10000,
              Other: 8000,
            },
          }
        : settings,
    },
  };
}
