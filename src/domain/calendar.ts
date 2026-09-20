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
