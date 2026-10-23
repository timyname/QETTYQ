import { describe, expect, it } from 'vitest';
import { preferenceCategorySummary } from '../../src/components/preference-category-summary';

describe('profile taxonomy summary', () => {
  it.each([
    ['ru', 'Категорий в предпочтениях: 4'],
    ['kk', 'Таңдаулы санаттар саны: 4'],
    ['en', 'Preference categories: 4'],
  ] as const)('names distinct categories, not liked cards (%s)', (language, expected) => {
    expect(preferenceCategorySummary(4, language)).toBe(expected);
  });
});
