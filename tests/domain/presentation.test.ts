import { expect, it } from 'vitest';
import { categoryTag, money, shortMoney, inputMoney } from '../../src/domain/presentation';
it('formats accurate cents and category aliases for the redesigned views', () => {
  expect(money(128640)).toBe('$1,286.40');
  expect(money(-10)).toBe('-$0.10');
  expect(shortMoney(180000)).toBe('$1,800');
  expect(shortMoney(105)).toBe('$1.05');
  expect(inputMoney(null)).toBe('');
  expect(inputMoney(1250)).toBe('12.50');
  expect(categoryTag('Transportation')).toBe('transport');
  expect(categoryTag('Food')).toBe('food');
});
