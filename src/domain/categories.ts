export const CATEGORIES = ['Food', 'Transportation', 'Housing', 'Study', 'Fun', 'Health', 'Other'] as const;
export type Category = typeof CATEGORIES[number];
export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#285848', Transportation: '#7c9d73', Housing: '#bb8648',
  Study: '#6f86a5', Fun: '#a7738d', Health: '#6d9997', Other: '#8c877c',
};
export function isCategory(value: unknown): value is Category {
  return CATEGORIES.some(category => category === value);
}
