function calendarDate(value: string): Date {
  const [year, month, day = 1] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  return date;
}
export function formatMonth(month: string): string {
  return calendarDate(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
export function formatDate(date: string): string {
  return calendarDate(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
export function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split('-').map(Number);
  const index = Math.max(12, Math.min(119999, year * 12 + number - 1 + delta));
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** Move whole calendar days without DST effects and keep dates within storage bounds. */
export function shiftDate(value: string, delta: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day + delta);
  if (date.getUTCFullYear() < 1) return '0001-01-01';
  if (date.getUTCFullYear() > 9999) return '9999-12-31';
  return date.toISOString().slice(0, 10);
}
