import { useState } from 'react';
import type { ExpenseValue } from '../domain/types';
import { parseExpensesCsv } from '../domain/csv';
import { MAX_EXPENSES } from '../config';
import { Modal } from './Modal';
export function ImportDialog({ today, count, onImport, onClose }: { today: string; count: number; onImport: (values: ExpenseValue[]) => void; onClose: () => void }) {
  const [values, setValues] = useState<ExpenseValue[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function read(file: File | undefined) {
    setValues([]); setError('');
    if (!file) return;
    if (file.size > 2_000_000) { setError('Choose a CSV smaller than 2 MB.'); return; }
    setLoading(true);
    try {
      const result = parseExpensesCsv(await file.text(), today);
      if (!result.ok) setError(result.error);
      else if (result.values.length + count > MAX_EXPENSES) setError('This import would exceed the 10,000-expense limit.');
      else setValues(result.values);
    } catch { setError('Could not read this file. Try selecting it again.'); }
    finally { setLoading(false); }
  }
  return <Modal title="Import CSV" onClose={onClose}><div className="dialog-heading"><h2>Import CSV</h2><button className="text-button" onClick={onClose}>cancel</button></div><p>Add records from a CSV. Existing expenses stay in place. Importing the same file twice adds duplicates.</p><p className="empty-note">Columns: date,description,category,amount,fixed. Dates use YYYY-MM-DD; fixed is true or false.</p><label className="file-label">Choose CSV<input type="file" accept=".csv,text/csv" disabled={loading} onChange={event => { void read(event.target.files?.[0]); }} /></label>{loading && <p role="status">Reading file…</p>}{error && <p role="alert" className="field-error">{error}</p>}{values.length > 0 && <p role="status">Ready to import {values.length} expenses.</p>}<button className="primary-button" disabled={loading || !values.length} onClick={() => onImport(values)}>Import expenses</button></Modal>;
}
