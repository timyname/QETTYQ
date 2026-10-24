import { describe, expect, it } from 'vitest';
import { isNegatedMention, placeCategoryQuery } from '../../src/server/retrieval/lexical-query';

const theatreMention = (text: string) => [...text.toLocaleLowerCase('ru-RU').matchAll(/театр\p{L}*/gu)][0];
describe('immediate Russian post-category negation, independent dialogue regressions', () => {
  it.each(['Театры не хочу, лучше стендап', 'Театр мне не нравится', 'Театры нам не нужны', 'Театр не интересует'])('rejects the explicitly negated category: %s', text => {
    const query = text.toLocaleLowerCase('ru-RU');
    expect(isNegatedMention(query, theatreMention(text))).toBe(true);
  });
  it.each(['Театры не только вечером', 'Театр не плохой', 'Театры вечером, не хочу кафе', 'Театры вечером — мне не нужно кафе'])('does not broaden negation across a clause or arbitrary modifier: %s', text => {
    const query = text.toLocaleLowerCase('ru-RU');
    expect(isNegatedMention(query, theatreMention(text))).toBe(false);
  });
  it('keeps the alternative category positive', () => {
    expect(placeCategoryQuery('Театры не хочу, лучше библиотеку')).toEqual({ wanted: ['library'], excluded: ['theatre'] });
  });
});
