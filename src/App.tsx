import { useCallback, useEffect, useMemo, useState } from 'react';
import { MAX_EXPENSES } from './config';
import { formatMonth } from './domain/calendar';
import { useToday } from './state/useToday';
import { expensesForMonth, monthKey } from './domain/calc';
import { parseCommand, MONTH_NAMES } from './domain/command';
import { exportExpensesCsv } from './domain/csv';
import { money } from './domain/presentation';
import { monthInsights } from './domain/insights';
import type { Expense, ExpenseValue } from './domain/types';
import { downloadCsv } from './storage/download';
import { useExpenses } from './state/useExpenses';
import { Navigation, type View } from './components/Navigation';
import { CalendarPage } from './components/CalendarPage';
import { LedgerPage } from './components/LedgerPage';
import { BudgetPage } from './components/BudgetPage';
import { QuickEntry } from './components/QuickEntry';
import { ExpenseEditor } from './components/ExpenseEditor';
import { ImportDialog } from './components/ImportDialog';
import { Modal } from './components/Modal';
import { UndoToast } from './components/UndoToast';
import { JudgeMode } from './components/JudgeMode';
import { BudgetCard } from './components/BudgetCard';

function newExpense(value: ExpenseValue): Expense {
  return {
    ...value,
    id: crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2),
    createdAt: Date.now(),
  };
}
export default function App() {
  const store = useExpenses();
  const { expenses, settings, storageNotice, applyRecurring } = store;
  const today = useToday();
  const [view, setView] = useState<View>('calendar');
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [lastDeleted, setLastDeleted] = useState<Expense | null>(null);
  const [lastAdded, setLastAdded] = useState<Expense | null>(null);
  const [entry, setEntry] = useState<{ date: string; text: string } | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [importing, setImporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const clearDeleted = useCallback(() => setLastDeleted(null), []);
  const monthList = useMemo(
    () => expensesForMonth(expenses, selectedMonth),
    [expenses, selectedMonth],
  );
  const spent = monthList.reduce((sum, item) => sum + item.amountMinor, 0);
  const budgetInsights = monthInsights(
    monthList,
    selectedMonth,
    today,
    settings.monthlyBudgetMinor,
    settings.recurring,
  );
  const reservedMinor = budgetInsights.monthFixedMinor - budgetInsights.fixedMinor;

  useEffect(() => {
    applyRecurring(today);
  }, [applyRecurring, today, settings.recurring, expenses.length]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (!editing && !importing && !showSettings)
          setEntry((current) => (current ? null : { date: today, text: '' }));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [today, editing, importing, showSettings]);

  function changeMonth(month: string) {
    setSelectedMonth(month);
    setSelectedDate(month === monthKey(today) ? today : `${month}-01`);
    setQuery('');
  }
  function addExpense(value: ExpenseValue) {
    const expense = newExpense(value);
    store.add(expense);
    setLastAdded(expense);
    setNotice(`Added ${money(value.amountMinor)} to ${formatMonth(monthKey(value.date))}.`);
  }
  function deleteExpense(expense: Expense) {
    const current = expenses.find((item) => item.id === expense.id);
    if (!current) {
      setNotice('This expense was deleted in another tab.');
      setEditing(null);
      return;
    }
    store.remove(current.id);
    setLastDeleted(current);
    setEditing(null);
  }
  function undoDelete(expense: Expense) {
    if (expenses.length >= MAX_EXPENSES) {
      setNotice('Could not restore: the 10,000-record limit was reached.');
      return;
    }
    store.restore(expense);
    clearDeleted();
    setNotice('Expense restored.');
  }
  function exportMonth(month: string) {
    try {
      downloadCsv(
        exportExpensesCsv(expensesForMonth(expenses, month)),
        `pocket-ledger-${month}.csv`,
      );
      setNotice(`Exported ${formatMonth(month)}.`);
    } catch {
      setNotice('Could not download CSV. Please try again in your browser.');
    }
  }
  function runCommand(text: string): string | null {
    const trimmed = text.trim();
    if (/^\/find(?:\s|$)/i.test(trimmed)) {
      setQuery(trimmed.replace(/^\/find\s*/i, ''));
      setView('ledger');
      return null;
    }
    if (/^\/export(?:\s|$)/i.test(trimmed)) {
      const match = trimmed.match(
        /^\/export(?:\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:\s+csv)?)?$/i,
      );
      if (!match) return 'Try /export or /export sep csv.';
      exportMonth(
        match[1]
          ? `${selectedMonth.slice(0, 4)}-${String(MONTH_NAMES.indexOf(match[1].toLowerCase()) + 1).padStart(2, '0')}`
          : selectedMonth,
      );
      return null;
    }
    if (trimmed.toLowerCase() === '/undo') {
      if (!lastAdded || !expenses.some((item) => item.id === lastAdded.id))
        return 'No recent entry to undo.';
      deleteExpense(lastAdded);
      setLastAdded(null);
      return null;
    }
    const result = parseCommand(text, today, entry!.date);
    if (!result.ok) return result.error;
    if (result.kind === 'budget') {
      if (result.category) store.setCategoryLimit(result.category, result.amountMinor);
      else store.setBudget(result.amountMinor);
      setNotice('Budget limit saved.');
      return null;
    }
    if (expenses.length >= MAX_EXPENSES)
      return 'You have reached 10,000 expenses. Delete a record before adding another.';
    if (result.kind === 'repeat') {
      if ((settings.recurring?.length ?? 0) >= MAX_EXPENSES)
        return 'You have reached the recurring-cost limit.';
      store.addRecurring({
        ...result.value,
        id: newExpense({ ...result.value, date: today }).id,
        startDate: today,
        lastAppliedMonth: null,
      });
      setNotice('Monthly fixed cost added.');
    } else addExpense(result.value);
    return null;
  }
  return (
    <div className="app-shell">
      <Navigation
        view={view}
        onView={setView}
        onAdd={() => setEntry({ date: today, text: '' })}
        onSettings={() => setShowSettings(true)}
      />
      {storageNotice && (
        <p className="notice" role="alert">
          {storageNotice}
        </p>
      )}
      <main aria-label="Pocket Ledger">
        {view === 'calendar' && (
          <CalendarPage
            month={selectedMonth}
            today={today}
            allExpenses={expenses}
            settings={settings}
            selected={selectedDate}
            onSelect={setSelectedDate}
            onMonth={changeMonth}
            onAdd={(date) => setEntry({ date, text: '' })}
            onBudget={() => setView('budget')}
            onEdit={setEditing}
          />
        )}
        {view === 'ledger' && (
          <LedgerPage
            key={selectedMonth}
            month={selectedMonth}
            today={today}
            expenses={monthList}
            budget={settings.monthlyBudgetMinor}
            query={query}
            onQuery={setQuery}
            onMonth={changeMonth}
            onEdit={setEditing}
            onImport={() => setImporting(true)}
            onExport={() => exportMonth(selectedMonth)}
          />
        )}
        {view === 'budget' && (
          <BudgetPage
            month={selectedMonth}
            today={today}
            expenses={monthList}
            settings={settings}
            onSettings={() => setShowSettings(true)}
            onBudget={store.setBudget}
            onLimit={store.setCategoryLimit}
            onRepeat={() => setEntry({ date: today, text: '/repeat ' })}
            onRemoveRepeat={(id) => {
              store.removeRecurring(id);
              setNotice('Recurring cost stopped. Existing expenses were kept.');
            }}
            onMonth={changeMonth}
          />
        )}
      </main>
      <div className="app-status" role="status">
        {notice && (
          <>
            <span>{notice}</span>
            <button aria-label="Dismiss message" onClick={() => setNotice('')}>
              ×
            </button>
          </>
        )}
      </div>
      {entry && (
        <QuickEntry
          today={today}
          date={entry.date}
          month={selectedMonth}
          expenses={expenses}
          initialText={entry.text}
          canAdd={expenses.length < MAX_EXPENSES}
          onRun={runCommand}
          onAdd={addExpense}
          onMonth={changeMonth}
          onClose={() => setEntry(null)}
        />
      )}
      {editing && (
        <ExpenseEditor
          expense={editing}
          today={today}
          onSave={(value) => {
            if (!expenses.some((item) => item.id === editing.id)) {
              setNotice('This expense was deleted in another tab.');
              setEditing(null);
              return;
            }
            store.update({ ...editing, ...value });
            setEditing(null);
            setNotice('Expense updated.');
          }}
          onDelete={() => deleteExpense(editing)}
          onClose={() => setEditing(null)}
        />
      )}
      {importing && (
        <ImportDialog
          today={today}
          count={expenses.length}
          onImport={(values) => {
            if (values.length + expenses.length > MAX_EXPENSES) {
              setNotice('Import cancelled: the 10,000-record limit was reached.');
              return;
            }
            const importedAt = Date.now();
            store.importExpenses(
              values.map((value, index) => ({
                ...newExpense(value),
                createdAt: importedAt + index,
              })),
            );
            setImporting(false);
            setNotice(`Imported ${values.length} expenses.`);
          }}
          onClose={() => setImporting(false)}
        />
      )}
      {showSettings && (
        <Modal title="Settings" onClose={() => setShowSettings(false)}>
          <div className="dialog-heading">
            <h2>Settings</h2>
            <button className="text-button" onClick={() => setShowSettings(false)}>
              close
            </button>
          </div>
          <p className="empty-note">
            Your data stays in this browser. No account or bank connection.
          </p>
          <BudgetCard
            budgetMinor={settings.monthlyBudgetMinor}
            spentMinor={spent}
            reservedMinor={reservedMinor}
            month={selectedMonth}
            today={today}
            onSave={store.setBudget}
            stipendDay={settings.stipendDay}
            onStipendSave={store.setStipendDay}
          />
          <JudgeMode />
        </Modal>
      )}
      {lastDeleted && (
        <UndoToast expense={lastDeleted} onUndo={undoDelete} onExpire={clearDeleted} />
      )}
    </div>
  );
}
