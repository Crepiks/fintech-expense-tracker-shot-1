import { useCallback, useMemo, useState } from 'react';
import { MAX_EXPENSES } from './config';
import { computeTotals, expensesForMonth, monthKey, todayLocal } from './domain/calc';
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
  const { expenses, settings, add, remove, restore, setBudget, storageNotice } = useExpenses();
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(todayLocal()));
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Expense | null>(null);
  const clearDeleted = useCallback(() => setLastDeleted(null), []);
  const monthList = useMemo(() => expensesForMonth(expenses, selectedMonth), [expenses, selectedMonth]);
  const totals = useMemo(() => computeTotals(monthList), [monthList]);

  function changeMonth(month: string) {
    setSelectedMonth(month);
    setCategoryFilter(null);
  }

  function addExpense(value: ExpenseValue) {
    add({ ...value, id: crypto.randomUUID(), createdAt: Date.now() });
  }

  return <div className="app-shell">
    <header className="site-header"><span className="wordmark">Pocket Ledger</span><span>Your money, a little clearer.</span></header>
    <main aria-label="Pocket Ledger">
      <div className="page-heading">
        <div><h1>A clearer picture of your spending.</h1><p>Track your daily expenses, stay within your budget, and feel more in control.</p></div>
        <MonthSwitcher month={selectedMonth} onChange={changeMonth} />
      </div>
      {storageNotice && <p className="notice" role="alert">{storageNotice}</p>}
      <div className="dashboard-grid">
        <div className="ledger-column">
          <Totals totals={totals} count={monthList.length} filter={categoryFilter} onFilter={setCategoryFilter} />
          <ExpenseList categoryFilter={categoryFilter} expenses={monthList} month={selectedMonth} onDelete={expense => { remove(expense.id); setLastDeleted(expense); }} />
        </div>
        <aside className="entry-column" aria-label="Manage expenses">
          <ExpenseForm selectedMonth={selectedMonth} onAdd={addExpense} onMonthChange={changeMonth} canAdd={expenses.length < MAX_EXPENSES} />
          <BudgetCard budgetMinor={settings.monthlyBudgetMinor} spentMinor={totals.totalMinor} month={selectedMonth} today={todayLocal()} onSave={setBudget} />
        </aside>
      </div>
    </main>
    {lastDeleted && <UndoToast expense={lastDeleted} onUndo={expense => { restore(expense); clearDeleted(); }} onExpire={clearDeleted} />}
    <footer className="site-footer"><p>All your data stays in your browser, on this device only.<br />No accounts, no banking connections. Just a little clarity.</p><JudgeMode /></footer>
  </div>;
}
