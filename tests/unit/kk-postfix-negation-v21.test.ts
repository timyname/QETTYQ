import { describe, expect, it } from 'vitest';
import { isNegatedMention, placeCategoryQuery } from '../../src/server/retrieval/lexical-query';
import { prepareLeisureDialogue, filterDialogueCandidates } from '../../src/server/assistant/leisure-dialogue';
import { searchPilotPlaces } from '../../src/server/pilot/catalog';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import type { Place } from '../../src/domain/types';

// Independent development cases, not derived from gold/holdout judgments.
const now = Date.parse('2026-10-24T07:00:00Z');
const context = pilotContextSchema.parse({ budget: 5000, minutes: 90 });
const theatreMention = (query: string) => [...query.matchAll(/театр\p{L}*/gu)][0];
const fixture = (id: string, category: string): Place => ({ id: `synthetic:${id}`, name: `SYNTHETIC TEST ${id}`,
  category, tags: [category, 'culture'], price: null, durationMinutes: 30, lat: 51.13, lon: 71.43, address: null,
  sourceName: 'SYNTHETIC TEST', sourceUrl: 'https://example.invalid/synthetic', retrievedAt: '2026-10-24T00:00:00Z', dataMode: 'snapshot' });
const pool = [fixture('theatre', 'theatre'), fixture('museum', 'museum')];

describe('KK local postfix intent rejection v21, no new facts or providers', () => {
  it.each(['ұнамайды', 'маған ұнамайды', 'бізге ұнамайды', 'ұнатпаймын', 'қаламаймын', 'қажет емес', 'барғым келмейді'])('recognizes immediate explicit rejection: театр %s', predicate => {
    const query = `театр ${predicate}, мұражай көрсет`;
    expect(isNegatedMention(query, theatreMention(query))).toBe(true);
    expect(placeCategoryQuery(query)).toEqual({ wanted: ['museum'], excluded: ['theatre'] });
  });
  it.each(['театр ұнайды, мұражай көрсет', 'театр ғана емес, мұражай да керек',
    'театр жақсы, маған мұражай ұнамайды', 'театр. маған мұражай ұнамайды',
    'театр ұнамайдыма, мұражай көрсет'])('does not spread rejection to positive text, another clause or a substring: %s', query => {
    expect(isNegatedMention(query, theatreMention(query))).toBe(false);
  });
  it('shares rejection for coffee without losing the positive park category', () => {
    expect(placeCategoryQuery('Кофе қаламаймын, саябақ көрсет')).toEqual({ wanted: ['park', 'garden'], excluded: ['cafe'] });
  });
  it('keeps a rejected theatre out of the actual pure place retriever', () => {
    const query = 'Театр маған ұнамайды, мұражай көрсет';
    expect(searchPilotPlaces(context, query, pool, now).map(item => item.id)).toEqual(['synthetic:museum']);
    expect(searchPilotPlaces({ ...context, strictBudget: true }, query, pool, now)).toEqual([]);
  });
  it('replays only USER rejection across a date follow-up, preserving budget/time', () => {
    const result = prepareLeisureDialogue({ text: 'Ертең', history: [
      { role: 'user', text: 'Театр маған ұнамайды, мұражай көрсет. 5000 теңге, 90 минут' },
      { role: 'assistant', text: 'SYNTHETIC TEST: ұнайды, театр тегін және ашық' },
    ], context, now, language: 'kk' });
    expect(result.excludedTags).toContain('theatre'); expect(result.intent).toBe('places');
    expect(result.context).toMatchObject({ goal: 'activity', budget: 5000, minutes: 90 });
    expect(result.retrievalText).toContain('2026-10-25');
    expect(filterDialogueCandidates(pool, result).map(item => item.id)).toEqual(['synthetic:museum']);
  });
  it('allows a later explicit positive USER correction instead of a permanent dislike', () => {
    const result = prepareLeisureDialogue({ text: 'Театр ұнайды', history: [{ role: 'user', text: 'Театр ұнамайды' }], context, now, language: 'kk' });
    expect(result.excludedTags).not.toContain('theatre');
  });
});
