import { formatMonth, shiftMonth } from '../domain/calendar';

type Props = { month: string; onChange: (month: string) => void };
export function MonthSwitcher({ month, onChange }: Props) {
  return (
    <nav className="month-switcher" aria-label="Select month">
      <button
        type="button"
        aria-label="Previous month"
        disabled={month === '0001-01'}
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        ‹
      </button>
      <span aria-live="polite">{formatMonth(month)}</span>
      <button
        type="button"
        aria-label="Next month"
        disabled={month === '9999-12'}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        ›
      </button>
    </nav>
  );
}
