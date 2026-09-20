import { Icon } from './Icon';
export type View = 'calendar' | 'ledger' | 'budget';
type Props = {
  view: View;
  onView: (view: View) => void;
  onAdd: () => void;
  onSettings: () => void;
};
export function Navigation({ view, onView, onAdd, onSettings }: Props) {
  return (
    <>
      <header className="site-header">
        <span className="wordmark">
          <span className="brand-mark" />
          Pocket Ledger
        </span>
        <nav className="desktop-nav" aria-label="Main navigation">
          {(['calendar', 'ledger', 'budget'] as const).map((item) => (
            <button
              key={item}
              aria-current={view === item ? 'page' : undefined}
              onClick={() => onView(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <button className="command-trigger" onClick={onAdd}>
          <Icon name="plus" />
          <span>{view === 'budget' ? '/budget #food 450' : '12.50 lunch #food yesterday'}</span>
          <kbd>⌘K</kbd>
        </button>
        <button className="icon-button" aria-label="Settings" onClick={onSettings}>
          <Icon name="settings" />
        </button>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {(['calendar', 'ledger'] as const).map((item) => (
          <button
            key={item}
            aria-current={view === item ? 'page' : undefined}
            onClick={() => onView(item)}
          >
            <Icon name={item} />
            {item}
          </button>
        ))}
        <button className="add-button" aria-label="Add expense" onClick={onAdd}>
          <Icon name="plus" />
        </button>
        <button
          aria-current={view === 'budget' ? 'page' : undefined}
          onClick={() => onView('budget')}
        >
          <Icon name="budget" />
          budget
        </button>
      </nav>
    </>
  );
}
