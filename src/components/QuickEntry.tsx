import { useEffect, useRef, useState } from 'react';
import type { Expense, ExpenseValue } from '../domain/types';
import { parseCommand } from '../domain/command';
import { CATEGORY_COLORS, CATEGORIES } from '../domain/categories';
import { categoryTag, money } from '../domain/presentation';
import { dateLabel } from '../domain/insights';
import { Modal } from './Modal';
import { ExpenseForm } from './ExpenseForm';

type Props = {
  today: string;
  date: string;
  month: string;
  expenses: Expense[];
  initialText: string;
  canAdd: boolean;
  onRun: (text: string) => string | null;
  onAdd: (expense: ExpenseValue) => void;
  onMonth: (month: string) => void;
  onClose: () => void;
};
const commands = [
  '/find #fun >20',
  '/budget #food 450',
  '/repeat phone 25 monthly #other',
  '/export',
  '/undo',
];
export function QuickEntry({
  today,
  date,
  month,
  expenses,
  initialText,
  canAdd,
  onRun,
  onAdd,
  onMonth,
  onClose,
}: Props) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [manual, setManual] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  // Native dialog opening can move focus away from React's initial autoFocus.
  useEffect(() => {
    ref.current!.focus();
  }, []);
  const parsed = parseCommand(text, today, date);
  const value = parsed.ok && parsed.kind === 'expense' ? parsed.value : null;
  const isCommand = text.trim().startsWith('/');
  function submit(keep: boolean) {
    const error = onRun(text);
    if (error) {
      setError(error);
      return;
    }
    if (!keep) {
      onClose();
      return;
    }
    setText('');
    setError('');
    setNotice('Saved. Ready for another.');
    ref.current!.focus();
  }
  function insert(token: string) {
    setText((current) =>
      token.startsWith('#')
        ? `${current.replace(/#[\w]+/g, '').trim()} ${token}`.trim()
        : `${current.trim()} ${token}`.trim(),
    );
    setError('');
    ref.current!.focus();
  }
  return (
    <Modal title="New entry" onClose={onClose} className="entry-modal">
      <header className="entry-heading">
        <button className="text-button" onClick={onClose}>
          cancel
        </button>
        <span className="eyebrow">NEW ENTRY</span>
        <button className="primary-button" onClick={() => submit(false)}>
          {isCommand ? 'run' : 'add'}
        </button>
      </header>
      <div className="entry-body">
        <label className="eyebrow" htmlFor="quick-note">
          TYPE IT LIKE A NOTE
        </label>
        <textarea
          aria-label="TYPE IT LIKE A NOTE"
          id="quick-note"
          ref={ref}
          autoFocus
          rows={2}
          autoComplete="off"
          spellCheck={false}
          placeholder="12.50 lunch #food"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
            setNotice('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit(event.shiftKey);
            }
          }}
        />
        {!isCommand && (
          <>
            <div className="entry-preview">
              <div>
                <span className="eyebrow">AMOUNT</span>
                <strong>{value ? money(value.amountMinor) : '—'}</strong>
              </div>
              <div>
                <span className="eyebrow">CATEGORY</span>
                <strong style={{ color: value ? CATEGORY_COLORS[value.category] : undefined }}>
                  {value ? `#${categoryTag(value.category)}` : '—'}
                </strong>
              </div>
              <div>
                <span className="eyebrow">DATE</span>
                <strong>{dateLabel(value?.date ?? date)}</strong>
              </div>
              <div>
                <span className="eyebrow">NOTE</span>
                <strong>{value?.description || '—'}</strong>
              </div>
            </div>
            <p className="entry-help">
              {value
                ? value.date > today
                  ? '// this date is in the future.'
                  : '// looks right. press enter'
                : '// start with an amount, e.g. 12.50 lunch #food'}
            </p>
          </>
        )}
        {isCommand && (
          <p className="entry-help">
            {parsed.ok
              ? parsed.kind === 'budget'
                ? `Set ${parsed.category ? '#' + categoryTag(parsed.category) : 'monthly'} limit to ${parsed.amountMinor === null ? 'no limit' : money(parsed.amountMinor)}.`
                : 'Create a monthly fixed cost.'
              : 'Choose a command below, or finish typing.'}
          </p>
        )}
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <p role="status" className="save-hint">
          {notice}
        </p>
        {!isCommand && (
          <>
            <h2 className="eyebrow">TAP TO INSERT</h2>
            <div className="entry-tokens">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  style={{ color: CATEGORY_COLORS[category] }}
                  aria-pressed={value?.category === category}
                  onClick={() => insert('#' + categoryTag(category))}
                >
                  #{categoryTag(category)}
                </button>
              ))}
              {['yesterday', 'fri', 'thu'].map((token) => (
                <button key={token} onClick={() => insert(token)}>
                  {token}
                </button>
              ))}
            </div>
          </>
        )}
        <h2 className="eyebrow">{isCommand ? 'COMMANDS' : 'AGAIN?'}</h2>
        <div className="suggestions">
          {isCommand
            ? commands.map((command) => (
                <button
                  key={command}
                  onClick={() => {
                    setText(command);
                    ref.current!.focus();
                  }}
                >
                  <span>/</span>
                  <code>{command}</code>
                </button>
              ))
            : [...expenses]
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 3)
                .map((expense) => {
                  const code = `${(expense.amountMinor / 100).toFixed(2)} ${expense.description || ''} #${categoryTag(expense.category)}`;
                  return (
                    <button
                      key={expense.id}
                      onClick={() => {
                        setText(code);
                        ref.current!.focus();
                      }}
                    >
                      <span>↺</span>
                      <code>{code}</code>
                      <small>{dateLabel(expense.date).split(' · ')[1]}</small>
                    </button>
                  );
                })}
        </div>
        {!isCommand && expenses.length === 0 && (
          <p className="empty-note">// your recent entries will appear here.</p>
        )}
        <button className="text-button manual-toggle" onClick={() => setManual(!manual)}>
          {manual ? 'hide form' : 'prefer a form?'}
        </button>
        {manual && (
          <ExpenseForm
            today={today}
            initialDate={date}
            selectedMonth={month}
            onAdd={onAdd}
            onMonthChange={onMonth}
            canAdd={canAdd}
          />
        )}
      </div>
      <footer className="entry-footer">
        <button className="primary-button" onClick={() => submit(false)}>
          {isCommand ? 'run command' : 'add expense'}
        </button>
        <button className="outline-button" onClick={() => submit(true)}>
          add & keep open
        </button>
        <button className="text-button" onClick={() => setText('/')}>
          / commands
        </button>
        <span>amount · note · #tag · when</span>
      </footer>
    </Modal>
  );
}
