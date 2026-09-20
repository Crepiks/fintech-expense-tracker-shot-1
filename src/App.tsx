import { useCallback, useMemo, useState } from 'react';
import { CURRENCY, MAX_EXPENSES } from './config';
import { formatAmount } from './domain/money';
import { formatDate } from './domain/calendar';
import { useToday } from './state/useToday';
import { computeTotals, expensesForMonth, monthKey } from './domain/calc';
import type { Category } from './domain/categories';
import type { Expense, ExpenseValue } from './domain/types';
import { useExpenses } from './state/useExpenses';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { MonthSwitcher } from './components/MonthSwitcher';
import { Totals } from './components/Totals';
import { UndoToast } from './components/UndoToast';
import { JudgeMode } from './components/JudgeMode';
import { BudgetCard } from './components/BudgetCard';

export default function App() {
  const { expenses, settings, add, remove, restore, setBudget, setStipendDay, storageNotice } =
    useExpenses();
  const today = useToday();
  const [actionNotice, setActionNotice] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(today));
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Expense | null>(null);
  const clearDeleted = useCallback(() => setLastDeleted(null), []);
  const monthList = useMemo(
    () => expensesForMonth(expenses, selectedMonth),
    [expenses, selectedMonth],
  );
  const totals = useMemo(() => computeTotals(monthList), [monthList]);

  // Drop stale filters after local deletions or incoming tab updates.
  if (categoryFilter !== null && totals.byCategory[categoryFilter] === 0) setCategoryFilter(null);

  function changeMonth(month: string) {
    setSelectedMonth(month);
    setCategoryFilter(null);
  }

  function undoDelete(expense: Expense) {
    if (expenses.length >= MAX_EXPENSES) {
      setActionNotice(
        `Could not restore ${CURRENCY} ${formatAmount(expense.amountMinor)} ${expense.category} expense dated ${formatDate(expense.date)}: the 10,000-record limit was reached.`,
      );
      return;
    }
    restore(expense);
    clearDeleted();
    setActionNotice('');
  }

  function addExpense(value: ExpenseValue) {
    add({
      ...value,
      id: crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2),
      createdAt: Date.now(),
    });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <span className="wordmark">Pocket Ledger</span>
        <span>Your money, a little clearer.</span>
      </header>
      <main aria-label="Pocket Ledger">
        <div className="page-heading">
          <div>
            <h1>A clearer picture of your spending.</h1>
            <p>Track your daily expenses, stay within your budget, and feel more in control.</p>
          </div>
          <MonthSwitcher month={selectedMonth} onChange={changeMonth} />
        </div>
        {storageNotice && (
          <p className="notice" role="alert">
            {storageNotice}
          </p>
        )}
        {actionNotice && (
          <p className="notice" role="alert">
            {actionNotice}
          </p>
        )}
        <div className="dashboard-grid">
          <div className="ledger-column">
            <Totals
              totals={totals}
              count={monthList.length}
              filter={categoryFilter}
              onFilter={setCategoryFilter}
            />
            {categoryFilter && (
              <p className="filter-hint">
                Showing {categoryFilter} only —{' '}
                {monthList.filter((expense) => expense.category === categoryFilter).length} of{' '}
                {monthList.length} expenses
              </p>
            )}
            <ExpenseList
              categoryFilter={categoryFilter}
              expenses={monthList}
              month={selectedMonth}
              onDelete={(expense) => {
                remove(expense.id);
                setLastDeleted(expense);
              }}
            />
          </div>
          <aside className="entry-column" aria-label="Manage expenses">
            <ExpenseForm
              today={today}
              selectedMonth={selectedMonth}
              onAdd={addExpense}
              onMonthChange={changeMonth}
              canAdd={expenses.length < MAX_EXPENSES}
            />
            <BudgetCard
              budgetMinor={settings.monthlyBudgetMinor}
              spentMinor={totals.totalMinor}
              month={selectedMonth}
              today={today}
              onSave={setBudget}
              stipendDay={settings.stipendDay}
              onStipendSave={setStipendDay}
            />
          </aside>
        </div>
      </main>
      {lastDeleted && (
        <UndoToast expense={lastDeleted} onUndo={undoDelete} onExpire={clearDeleted} />
      )}
      <footer className="site-footer">
        <p>
          All your data stays in your browser, on this device only.
          <br />
          No accounts, no banking connections. Just a little clarity.
        </p>
        <JudgeMode />
      </footer>
    </div>
  );
}
