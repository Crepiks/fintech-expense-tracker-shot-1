import { useMemo, useState } from 'react';
import { MAX_EXPENSES } from './config';
import { computeTotals, expensesForMonth, monthKey, todayLocal } from './domain/calc';
import type { ExpenseValue } from './domain/types';
import { useExpenses } from './state/useExpenses';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { MonthSwitcher } from './components/MonthSwitcher';
import { Totals } from './components/Totals';

export default function App() {
  const { expenses, add, remove, storageNotice } = useExpenses();
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(todayLocal()));
  const monthList = useMemo(() => expensesForMonth(expenses, selectedMonth), [expenses, selectedMonth]);
  const totals = useMemo(() => computeTotals(monthList), [monthList]);

  function addExpense(value: ExpenseValue) {
    add({ ...value, id: crypto.randomUUID(), createdAt: Date.now() });
  }

  return <div className="app-shell">
    <header className="site-header"><span className="wordmark">Pocket Ledger</span><span>Your money, a little clearer.</span></header>
    <main aria-label="Pocket Ledger">
      <div className="page-heading">
        <div><h1>A clearer picture of your spending.</h1><p>Track your daily expenses, stay within your budget, and feel more in control.</p></div>
        <MonthSwitcher month={selectedMonth} onChange={setSelectedMonth} />
      </div>
      {storageNotice && <p className="notice" role="alert">{storageNotice}</p>}
      <div className="dashboard-grid">
        <div className="ledger-column">
          <Totals totals={totals} count={monthList.length} />
          <ExpenseList expenses={monthList} month={selectedMonth} onDelete={expense => remove(expense.id)} />
        </div>
        <aside className="entry-column" aria-label="Manage expenses">
          <ExpenseForm selectedMonth={selectedMonth} onAdd={addExpense} onMonthChange={setSelectedMonth} canAdd={expenses.length < MAX_EXPENSES} />
        </aside>
      </div>
    </main>
    <footer className="site-footer"><p>All your data stays in your browser, on this device only.<br />No accounts, no banking connections. Just a little clarity.</p></footer>
  </div>;
}
