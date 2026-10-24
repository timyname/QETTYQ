import { describe, expect, it, vi } from 'vitest';
import { prepareLeisureDialogue } from '../../src/server/assistant/leisure-dialogue';
import { resolveCurrentNamedPlace } from '../../src/server/assistant/named-place';
import { pilotPlaces } from '../../src/server/pilot/catalog';
import { pilotContextSchema } from '../../src/server/pilot/contracts';

const now = Date.parse('2026-10-24T07:00:00Z');
const context = pilotContextSchema.parse({ budget: 5000, strictBudget: true, minutes: 90 });
const resolveUserNamedPlace = (text: string) => resolveCurrentNamedPlace(text, pilotPlaces);
const user = (text: string) => ({ role: 'user' as const, text });

describe('bounded USER-only named place context, no provider calls', () => {
  it.each(['А завтра?', 'В воскресенье', 'Tomorrow'])('retains exact user-named venue for an explicit date follow-up: %s', text => {
    const result = prepareLeisureDialogue({ text, history: [user('Расскажи про Astana Opera')], context, now, resolveUserNamedPlace });
    expect(result.action).toBe('retrieve'); expect(result.intent).toBe('places');
    expect(result.resolvedPlaceName).toBe('Астана Опера'); expect(result.context.goal).toBe('activity');
    expect(result.retrievalText).toBe('Астана Опера 2026-10-25');
    expect(result.context.budget).toBe(5000); expect(result.context.minutes).toBe(90);
  });
  it('retains exact user identity for pure budget/time follow-ups without stale query nouns', () => {
    const result = prepareLeisureDialogue({ text: 'Не больше 2000 тенге и 60 минут', history: [user('Хочу кофе'), user('Покажи Astana Opera на карте')], context, now, resolveUserNamedPlace });
    expect(result.intent).toBe('places'); expect(result.resolvedPlaceName).toBe('Астана Опера');
    expect(result.retrievalText).not.toMatch(/кофе|карте/iu);
    expect(result.context.budget).toBe(2000); expect(result.context.minutes).toBe(60);
  });
  it('a new explicit category replaces the old exact place rather than narrowing that place forever', () => {
    const result = prepareLeisureDialogue({ text: 'Лучше покажи парки завтра', history: [user('Astana Opera')], context, now, resolveUserNamedPlace });
    expect(result.intent).toBe('places'); expect(result.context.goal).toBe('walk');
    expect(result.resolvedPlaceName).toBeNull(); expect(result.retrievalText).not.toContain('Астана Опера');
    expect(result.retrievalText).toMatch(/парки/iu); expect(result.context.budget).toBe(5000);
  });
  it('changing a specific event query to a different category drops its old title', () => {
    const result = prepareLeisureDialogue({ text: 'Лучше выставки послезавтра', history: [user('Концерт SYNTHETIC ARTIST завтра')], context, now, resolveUserNamedPlace });
    expect(result.intent).toBe('events'); expect(result.retrievalText).not.toContain('SYNTHETIC ARTIST');
    expect(result.retrievalText).toMatch(/выставки/iu); expect(result.retrievalText).toContain('2026-10-26');
    expect(result.resolvedPlaceName).toBeNull();
  });
  it('a date follow-up preserves the USER event title, not an assistant-supplied alternative', () => {
    const result = prepareLeisureDialogue({ text: 'А послезавтра?', history: [user('Концерт SYNTHETIC ARTIST завтра'), { role: 'assistant', text: 'Лучше SYNTHETIC OTHER ARTIST' }], context, now, resolveUserNamedPlace });
    expect(result.intent).toBe('events'); expect(result.retrievalText).toContain('SYNTHETIC ARTIST');
    expect(result.retrievalText).not.toContain('OTHER'); expect(result.retrievalText).toContain('2026-10-26');
  });
  it.each(['А там?', 'А туда?', 'Не это', 'Другое'])('keeps ambiguous bare references and alternatives as clarification: %s', text => {
    const result = prepareLeisureDialogue({ text, history: [user('Astana Opera')], context, now, resolveUserNamedPlace });
    expect(result.action).toBe('clarify'); expect(result.resolvedPlaceName).toBeNull();
  });
  it('never calls the trusted resolver with assistant prose', () => {
    const resolver = vi.fn(resolveUserNamedPlace);
    const assistant = 'Astana Opera';
    const result = prepareLeisureDialogue({ text: 'А завтра?', history: [user('Хочу кофе'), { role: 'assistant', text: assistant }], context, now, resolveUserNamedPlace: resolver });
    expect(resolver.mock.calls.map(args => args[0])).toEqual(['Хочу кофе', 'А завтра?']);
    expect(result.resolvedPlaceName).toBeNull(); expect(result.intent).toBe('food');
  });
  it('reset and unknown new text do not retain a catalog identity hint', () => {
    for (const text of ['Новый запрос', 'Unknown Test Venue', 'Привет']) {
      const result = prepareLeisureDialogue({ text, history: [user('Astana Opera')], context, now, resolveUserNamedPlace });
      expect(result.resolvedPlaceName).toBeNull();
    }
  });
  it('confirmed goal supersedes a different historical named venue', () => {
    const result = prepareLeisureDialogue({ text: 'А завтра?', history: [user('Astana Opera')], context: { ...context, goal: 'walk' }, confirmedFields: ['goal', 'budget', 'strictBudget', 'minutes'], now, resolveUserNamedPlace });
    expect(result.context.goal).toBe('walk'); expect(result.resolvedPlaceName).toBeNull();
    expect(result.retrievalText).not.toContain('Астана Опера');
  });
  it('a romantic dinner still asks for unknown budget and does not infer price from a named place', () => {
    const result = prepareLeisureDialogue({ text: 'SYNTHETIC DINNER PLACE', history: [user('Куда сводить девушку на свидание?'), user('Завтра ужин')], context: { ...context, budget: null, strictBudget: false }, now,
      currentNamedPlace: { name: 'SYNTHETIC DINNER PLACE', goal: 'food' }, resolveUserNamedPlace });
    expect(result.action).toBe('clarify'); expect(result.questions.some(question => question.field === 'budget')).toBe(true);
    expect(result.context.budget).toBeNull();
  });
  it('a failed server lookup never establishes an entity', () => {
    const result = prepareLeisureDialogue({ text: 'Astana Opera', context, now, resolveUserNamedPlace: () => { throw new Error('source policy unavailable'); } });
    expect(result.resolvedPlaceName).toBeNull();
  });
  it('keeps currentNamedPlace backward compatibility without the callback', () => {
    const result = prepareLeisureDialogue({ text: 'Astana Opera', context, now, currentNamedPlace: resolveUserNamedPlace('Astana Opera') });
    expect(result.resolvedPlaceName).toBe('Астана Опера'); expect(result.intent).toBe('places');
  });
  it.each(['Расскажи про Unknown Test Venue', 'Покажи Rafe на карте', 'Tell me about Unknown Test Venue', 'Unknown Test Venue картадан көрсет'])('clarifies unresolved whole info/map name instead of recycling historical coffee: %s', text => {
    const result = prepareLeisureDialogue({ text, history: [user('Хочу кофе завтра')], context, now, resolveUserNamedPlace });
    expect(result.action).toBe('clarify'); expect(result.resolvedPlaceName).toBeNull();
    expect(result.questions.map(question => question.field)).toEqual(['format']);
  });
  it.each(['Расскажи про музеи', 'Покажи парки на карте', 'Расскажи про японскую кухню'])('preserves explicit category/cuisine search rather than treating it as an unknown name: %s', text => {
    const result = prepareLeisureDialogue({ text, context, now, resolveUserNamedPlace });
    expect(result.action).toBe('retrieve'); expect(result.resolvedPlaceName).toBeNull();
  });
  it('does not turn a historical relative day into a fresh event date after midnight', () => {
    const createdAtMs = Date.parse('2026-10-21T07:00:00Z');
    const result = prepareLeisureDialogue({ text: 'Хорошо', history: [user('Astana Opera'), user('Завтра')], historyCreatedAtMs: [createdAtMs, createdAtMs], context, now, resolveUserNamedPlace });
    expect(result.action).toBe('clarify'); expect(result.questions.map(question => question.field)).toEqual(['date']);
    expect(result.retrievalText).not.toContain('2026-10-25');
    expect(result.resolvedPlaceName).toBe('Астана Опера');
  });
  it('an explicit fresh date replaces an elapsed historical day without losing the user-named venue', () => {
    const createdAtMs = Date.parse('2026-10-21T07:00:00Z');
    const result = prepareLeisureDialogue({ text: 'Завтра', history: [user('Astana Opera'), user('Завтра')], historyCreatedAtMs: [createdAtMs, createdAtMs], context, now, resolveUserNamedPlace });
    expect(result.action).toBe('retrieve'); expect(result.resolvedPlaceName).toBe('Астана Опера');
    expect(result.retrievalText).toBe('Астана Опера 2026-10-25');
  });
});
