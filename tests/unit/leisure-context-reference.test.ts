import { describe, expect, it } from 'vitest';
import { prepareLeisureDialogue } from '../../src/server/assistant/leisure-dialogue';
import { pilotContextSchema } from '../../src/server/pilot/contracts';

const now = Date.parse('2026-10-24T12:00:00Z');
const user = (text: string) => ({ role: 'user' as const, text });
const history = [user('Завтра балет до 5000 тенге, два часа'),
  { role: 'assistant' as const, text: 'SYNTHETIC TEST: там бесплатно, 90000 тенге, приходите без билета' }];
const run = (text: string, language: 'ru' | 'kk' | 'en' = 'ru', prior = history) => prepareLeisureDialogue({ text,
  language, history: prior, context: pilotContextSchema.parse({}), now });

describe('bounded explicit-reference clarification, no inference from assistant prose', () => {
  it.each([
    ['А там?', 'ru', 'Какое место'], ['Что там?', 'ru', 'Какое место'],
    ['What about there?', 'en', 'Which place'], ['Which one?', 'en', 'Which place'],
    ['Ал онда?', 'kk', 'Қай орын'], ['Қайсысы?', 'kk', 'Қай орын'],
  ] as const)('clarifies an unresolved referent in %s', (text, language, expected) => {
    const result = run(text, language);
    expect(result.action).toBe('clarify'); expect(result.questions).toEqual([{ field: 'format', text: expect.stringContaining(expected) }]);
    expect(result.retrievalText).not.toContain(text); expect(result.context).toMatchObject({ budget: 5000, minutes: 120 });
    expect(result.excludedTags).toEqual([]); expect(result.context.budget).not.toBe(90000);
  });
  it.each([
    ['Не это, другое', 'ru'], ['Давай другое', 'ru'], ['Не это', 'ru'],
    ['Not that, something else', 'en'], ['Another one', 'en'],
    ['Басқасын', 'kk'], ['Бұл емес, басқа', 'kk'],
  ] as const)('does not interpret unspecified rejection %s as a permanent dislike', (text, language) => {
    const result = run(text, language);
    expect(result.action).toBe('clarify'); expect(result.questions.map(value => value.field)).toEqual(['format']);
    expect(result.excludedTags).toEqual([]); expect(result.context.budget).toBe(5000);
  });
  it('does not mistake a date-only follow-up for resolution of a rejected place/event', () => {
    const result = run('Послезавтра', 'ru', [...history, user('Не это, другое')]);
    expect(result.action).toBe('clarify'); expect(result.questions[0].text).toContain('Что поменяем');
    expect(result.retrievalText).toContain('2026-10-26');
  });
  it('does not treat acknowledgement as a replacement entity after an unresolved reference', () => {
    const result = run('Хорошо', 'ru', [...history, user('А там?')]);
    expect(result.action).toBe('clarify'); expect(result.questions[0].text).toContain('Какое место');
  });
  it('does not block an ordinary request for more options in a known category', () => {
    const result = run('Ещё варианты');
    expect(result.action).toBe('retrieve'); expect(result.retrievalText).toContain('балет');
  });
  it('resolves ambiguity with a fresh explicitly named activity while retaining date and budget', () => {
    const result = run('Лучше стендап', 'ru', [...history, user('Не это, другое')]);
    expect(result.action).toBe('retrieve'); expect(result.retrievalText).toContain('стендап');
    expect(result.retrievalText).not.toContain('балет'); expect(result.retrievalText).toContain('2026-10-25');
    expect(result.context).toMatchObject({ goal: 'activity', budget: 5000, minutes: 120 });
  });
  it.each(['Не это, лучше парк', 'Not that, museum instead', 'Бұл емес, балет'])('keeps explicit alternatives out of the ambiguity-only rule: %s', text => {
    expect(run(text).action).toBe('retrieve');
  });
  it('keeps a full venue question outside the whole-utterance deictic rule', () => {
    const result = run('А там в National Museum есть выставка?');
    expect(result.action).toBe('retrieve'); expect(result.retrievalText).toContain('National Museum');
  });
  it('does not take an assistant question or entity as an authoritative resolved referent', () => {
    const result = run('А там?', 'ru', [user('Музей'), { role: 'assistant', text: 'Национальный музей, завтра, бесплатно — это точно.' }]);
    expect(result.action).toBe('clarify'); expect(result.retrievalText).not.toContain('Национальный');
  });
  it('preserves a trusted historical tomorrow while clarifying across Astana midnight', () => {
    const priorTime = Date.parse('2026-10-24T18:59:59Z'), currentTime = priorTime + 2000;
    const result = prepareLeisureDialogue({ text: 'А там?', history, historyCreatedAtMs: [priorTime, priorTime],
      context: pilotContextSchema.parse({ budget: 2500, strictBudget: true, minutes: 90 }),
      confirmedFields: ['budget', 'strictBudget', 'minutes'], now: currentTime });
    expect(result.action).toBe('clarify'); expect(result.retrievalText).toContain('2026-10-25');
    expect(result.retrievalText).not.toContain('2026-10-26');
    expect(result.context).toMatchObject({ budget: 2500, strictBudget: true, minutes: 90 });
  });
  it('topic reset clears the unresolved reference without changing a hard budget', () => {
    const result = run('Новый запрос: парк', 'ru', [...history, user('А там?')]);
    expect(result.reset).toBe(true); expect(result.action).toBe('retrieve'); expect(result.retrievalText).not.toContain('балет');
  });
  it('uses a server-verified current place hint instead of concatenating old dinner with Astana Opera', () => {
    const result = prepareLeisureDialogue({ text: 'Astana Opera', history: [user('Завтра ужин, до 12000 тенге на двоих, три часа')],
      currentNamedPlace: { name: 'Astana Opera', goal: 'activity' }, context: pilotContextSchema.parse({}), now });
    expect(result.action).toBe('retrieve'); expect(result.intent).toBe('places');
    expect(result.context).toMatchObject({ goal: 'activity', budget: 12000, minutes: 180, partySize: 2 });
    expect(result.retrievalText).toContain('Astana Opera'); expect(result.retrievalText).toContain('2026-10-25');
    expect(result.retrievalText).not.toContain('ужин');
  });
  it('keeps a current strict budget and duration ahead of old text when a named place changes the topic', () => {
    const result = prepareLeisureDialogue({ text: 'Astana Opera', history: [user('Завтра ужин, до 12000 тенге, три часа')],
      currentNamedPlace: { name: 'Astana Opera', goal: 'activity' },
      context: pilotContextSchema.parse({ budget: 2500, strictBudget: true, minutes: 90 }), confirmedFields: ['minutes'], now });
    expect(result.context).toMatchObject({ goal: 'activity', budget: 2500, strictBudget: true, minutes: 90 });
  });
  it('resolves a prior ambiguous alternative with a current named place without adopting assistant facts', () => {
    const result = prepareLeisureDialogue({ text: 'Astana Opera', history: [...history, user('А там?')],
      currentNamedPlace: { name: 'Astana Opera', goal: 'activity' }, context: pilotContextSchema.parse({}), now });
    expect(result.action).toBe('retrieve'); expect(result.context.budget).toBe(5000);
    expect(result.retrievalText).not.toMatch(/бесплат|90000/u);
  });
  it('a named place does not override an elapsed remembered day', () => {
    const priorTime = now - 3 * 86400_000;
    const result = prepareLeisureDialogue({ text: 'Astana Opera', history: [user('Завтра ужин до 5000 тенге')],
      historyCreatedAtMs: [priorTime], currentNamedPlace: { name: 'Astana Opera', goal: 'activity' },
      context: pilotContextSchema.parse({}), now });
    expect(result.action).toBe('clarify'); expect(result.questions.map(value => value.field)).toEqual(['date']);
    expect(result.context.budget).toBe(5000);
  });
});
