import { useRef, useState } from 'react';
import { runSelfTest, type ScenarioResult } from '../domain/selfTest';
import { ScenarioDialog } from './ScenarioDialog';

export function JudgeMode() {
  const trigger = useRef<HTMLButtonElement>(null);
  const [results, setResults] = useState<ScenarioResult[] | null>(null);
  function close() {
    setResults(null);
    trigger.current!.focus();
  }
  return (
    <>
      <button
        type="button"
        className="outline-button"
        ref={trigger}
        onClick={() => setResults(runSelfTest())}
      >
        Run validation scenario
      </button>
      {results && (
        <ScenarioDialog
          results={results}
          onClose={close}
          onRunAgain={() => setResults(runSelfTest())}
        />
      )}
    </>
  );
}
