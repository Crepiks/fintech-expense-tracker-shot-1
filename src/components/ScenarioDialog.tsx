import { useEffect, useRef } from 'react';
import { CURRENCY } from '../config';
import type { ScenarioResult } from '../domain/selfTest';

type Props = { results: ScenarioResult[]; onClose: () => void; onRunAgain: () => void };
export function ScenarioDialog({ results, onClose, onRunAgain }: Props) {
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
    <div className="dialog-heading"><h2 id="scenario-title">Validation scenario (section 6 of the brief)</h2><button type="button" className="outline-button" onClick={close} aria-label="Close validation">Close</button></div>
    <p id="scenario-description">Add Food 1,500, Transportation 600, and Food 900. Then delete Food 900. Runs on a temporary copy. Your data is not touched.</p>
    <p className="scenario-result" role="status">{results.filter(result => result.pass).length} of {results.length} checks passed</p>
    <div className="table-scroll">
      <table>
        <caption>Amounts in {CURRENCY}</caption>
        <thead><tr><th>Step</th><th>Check</th><th className="numeric">Expected</th><th className="numeric">Actual</th><th>Result</th></tr></thead>
        <tbody>{results.map(result => <tr key={`${result.step}-${result.label}`}>
          <td>{result.step}</td><td>{result.label}</td><td className="numeric">{result.expected}</td><td className="numeric">{result.actual}</td>
          <td className={result.pass ? 'check-pass' : 'field-error'}>{result.pass ? 'PASS' : 'FAIL'}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <button type="button" className="outline-button" onClick={onRunAgain}>Run again</button>
  </dialog>;
}
