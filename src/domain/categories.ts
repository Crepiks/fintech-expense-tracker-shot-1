export const CATEGORIES = [
  'Food',
  'Transportation',
  'Housing',
  'Study',
  'Fun',
  'Health',
  'Other',
] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#2448c9',
  Transportation: '#c47512',
  Housing: '#13161b',
  Study: '#2f8f6b',
  Fun: '#a2479b',
  Health: '#2f8196',
  Other: '#6b717c',
};
export function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((category) => category === value);
}
