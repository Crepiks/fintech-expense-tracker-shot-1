import { useState } from 'react';
import { formatMonth } from '../domain/calendar';
import type { DemoResult } from '../domain/demo';
import { Icon } from './Icon';

type Props = { month: string; onLoad: () => DemoResult; storageNotice: string };

export function DemoDataCard({ month, onLoad, storageNotice }: Props) {
  const [result, setResult] = useState<DemoResult | null>(null);
  return <section className="demo-card" aria-labelledby="demo-title">
    <div className="demo-heading">
      <span className="demo-icon"><Icon name="budget" /></span>
      <div><p className="eyebrow">A little inspiration</p><h2 id="demo-title">Explore with demo data</h2></div>
    </div>
    <p className="demo-description">Everyday purchases, a few treats, and the bills in between. Bring your calendar, ledger, and budget to life.</p>
    <p className="demo-period">{formatMonth(month)} + two previous months</p>
    <button type="button" className="primary-button demo-button" onClick={() => setResult(onLoad())}>
      <Icon name="plus" /><span>Add demo data</span><span aria-hidden="true">↗</span>
    </button>
    <p className="demo-hint">Your entries and settings stay yours. Example limits are added only to an empty, unconfigured tracker. Safe to click again.</p>
    <p className="demo-feedback" role="status">{result && !result.error && (result.added
      ? `Added ${result.added} demo ${result.added === 1 ? 'expense' : 'expenses'}. Close Settings to explore.`
      : 'Demo expenses are already present. Your edits were kept.')}</p>
    {result?.error && <p className="field-error" role="alert">{result.error}</p>}
    {storageNotice && <p className="field-error" role="alert">{storageNotice}</p>}
  </section>;
}
