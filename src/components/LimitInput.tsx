import { useEffect, useState } from 'react';
import { parseAmount } from '../domain/money';
import { inputMoney } from '../domain/presentation';
export function LimitInput({ label, value, onSave }: { label: string; value: number | null; onSave: (minor: number | null) => void }) {
  const [input, setInput] = useState(inputMoney(value));
  const [error, setError] = useState('');
  useEffect(() => { setInput(inputMoney(value)); }, [value]);
  function save() {
    const result = input.trim() ? parseAmount(input) : { ok: true as const, minor: null };
    if (!result.ok) { setError(result.error); return; }
    setError('');
    onSave(result.minor);
  }
  return <label className="limit-input"><span className="sr-only">{label}</span><input aria-label={label} type="text" inputMode="decimal" placeholder="No limit" value={input} aria-invalid={!!error} onChange={event => setInput(event.target.value)} onBlur={save} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); save(); } }} />{error && <span role="alert" className="field-error">{error}</span>}</label>;
}
