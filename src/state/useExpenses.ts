import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Category } from '../domain/categories';
import type { Expense, RecurringCost } from '../domain/types';
import { load, save, subscribe } from '../storage/storage';
import { expensesReducer } from './reducer';
import { prepareDemoData, type DemoResult } from '../domain/demo';

export function useExpenses() {
  const initialNotice = useRef('');
  const lastSaved = useRef<string | null>(null);
  const [state, dispatch] = useReducer(expensesReducer, undefined, () => {
    const loaded = load();
    initialNotice.current = loaded.notice;
    return loaded.data;
  });
  const [storageNotice, setStorageNotice] = useState(initialNotice.current);
  // Consumers can depend on this action without rerunning on unrelated renders.
  const applyRecurring = useCallback(
    (today: string) => {
      dispatch({ type: 'applyRecurring', today });
    },
    [dispatch],
  );

  useEffect(() => {
    const raw = JSON.stringify(state);
    if (raw === lastSaved.current) return;
    if (save(state)) {
      lastSaved.current = raw;
      setStorageNotice(initialNotice.current);
    } else {
      setStorageNotice(
        'Could not save. Storage is full or unavailable. Changes are only in this tab until saving succeeds.',
      );
    }
  }, [state]);

  useEffect(
    () =>
      subscribe((incoming, raw) => {
        if (raw === lastSaved.current) return;
        // Remote updates must not echo writes back to the originating tab.
        lastSaved.current = JSON.stringify(incoming.data);
        if (incoming.recovered)
          setStorageNotice('Data from another tab was recovered. Invalid records were removed.');
        dispatch({ type: 'replaceAll', data: incoming.data });
      }),
    [],
  );

  return {
    expenses: state.expenses,
    settings: state.settings,
    add: (expense: Expense) => dispatch({ type: 'add', expense }),
    update: (expense: Expense) => dispatch({ type: 'update', expense }),
    importExpenses: (expenses: Expense[]) => dispatch({ type: 'importExpenses', expenses }),
    loadDemo: (month: string, today: string): DemoResult => {
      const { added, error } = prepareDemoData(state, month, today);
      dispatch({ type: 'loadDemo', month, today });
      return { added, error };
    },
    remove: (id: string) => dispatch({ type: 'remove', id }),
    restore: (expense: Expense) => dispatch({ type: 'restore', expense }),
    setBudget: (minor: number | null) => dispatch({ type: 'setBudget', minor }),
    setStipendDay: (day: number | null) => dispatch({ type: 'setStipendDay', day }),
    setCategoryLimit: (category: Category, minor: number | null) =>
      dispatch({ type: 'setCategoryLimit', category, minor }),
    addRecurring: (cost: RecurringCost) => dispatch({ type: 'addRecurring', cost }),
    removeRecurring: (id: string) => dispatch({ type: 'removeRecurring', id }),
    applyRecurring,
    storageNotice,
  };
}
