import { useEffect, useRef } from 'react';
import { CURRENCY } from '../config';
import { formatAmount } from '../domain/money';
import type { ScenarioResult } from '../domain/selfTest';

type Props = { results: ScenarioResult[]; onClose: () => void };
const display = (value: number | boolean) => typeof value === 'number' ? formatAmount(value) : String(value);

export function ScenarioDialog({ results, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  function close() {
    dialog.current!.close();
    onClose();
  }
  return <dialog ref={dialog} className="scenario-dialog" aria-labelledby="scenario-title" aria-describedby="scenario-description" onCancel={close}>
    <div className="dialog-heading"><h2 id="scenario-title">Validation scenario</h2><button type="button" className="outline-button" onClick={close} aria-label="Close validation">Close</button></div>
    <p id="scenario-description">Add Food 1,500, Transportation 600, and Food 900. Then delete Food 900. This runs in memory and never changes your expenses.</p>
    <p className="scenario-result" role="status">{results.filter(result => result.pass).length} of {results.length} checks passed</p>
    <div className="table-scroll">
      <table>
        <caption>Amounts in {CURRENCY}</caption>
        <thead><tr><th>Check</th><th className="numeric">Expected</th><th className="numeric">Actual</th><th>Result</th></tr></thead>
        <tbody>{results.map(result => <tr key={result.label}>
          <td>{result.label}</td><td className="numeric">{display(result.expected)}</td><td className="numeric">{display(result.actual)}</td>
          <td className={result.pass ? 'check-pass' : 'field-error'}>{result.pass ? 'Pass' : 'Fail'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </dialog>;
}
