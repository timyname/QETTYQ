import { describe, expect, it } from 'vitest';
import { formatDurationMinutes } from '../../src/client/format-duration';

describe('compact elapsed duration', () => {
  it.each([
    [0, 'ru', '0 мин'], [59, 'ru', '59 мин'], [60, 'ru', '1 ч'],
    [61, 'ru', '1 ч 1 мин'], [202, 'ru', '3 ч 22 мин'],
    [202, 'kk', '3 сағ 22 мин'], [202, 'en', '3 h 22 min'],
    [60, 'kk', '1 сағ'], [60, 'en', '1 h'],
    [59.5, 'ru', '1 ч'], [1440, 'en', '24 h'],
  ] as const)('formats %s in %s without losing hours', (minutes, language, expected) => {
    expect(formatDurationMinutes(minutes, language)).toBe(expected);
  });
  it.each([null, -1, Number.NaN, Number.POSITIVE_INFINITY])('does not invent unknown/invalid duration %s', minutes => {
    expect(formatDurationMinutes(minutes, 'ru')).toBeNull();
  });
});
