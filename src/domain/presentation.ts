import { CURRENCY } from '../config';
import type { Category } from './categories';
export const DISPLAY_CATEGORIES: Category[] = ['Housing', 'Food', 'Transportation', 'Fun', 'Study', 'Health', 'Other'];
export const categoryTag = (category: Category) => category === 'Transportation' ? 'transport' : category.toLowerCase();
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY });
export const money = (minor: number) => currency.format(minor / 100);
export const shortMoney = (minor: number) => money(minor).replace(/\.00$/, '');
export const inputMoney = (minor: number | null) => minor === null ? '' : (minor / 100).toFixed(2);
