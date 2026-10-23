import { describe, expect, it } from 'vitest';
import { prepareLeisureDialogue, filterDialogueCandidates } from '../../src/server/assistant/leisure-dialogue';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import { parseContext, answerPilotChat, answerPilotChatWithEvents } from '../../src/server/pilot/chat';

const now = Date.parse('2026-10-21T07:00:00Z');
const context = () => pilotContextSchema.parse({});
const user = (text: string) => ({ role: 'user' as const, text });
const assistant = (text: string) => ({ role: 'assistant' as const, text });
const run = (text: string, history: unknown = [], language: 'ru' | 'kk' | 'en' = 'ru') => prepareLeisureDialogue({ text, history, language, context: context(), now });

describe('bounded leisure assistant dialogue (offline, no provider)', () => {
  it('asks only two relevant missing questions for dating and infers no partner profile', () => {
    const result = run('Хочу девушку сводить на свидание');
    expect(result.action).toBe('clarify'); expect(result.intent).toBe('date');
    expect(result.questions.map(q => q.field)).toEqual(['format', 'date']);
    expect(result.context.partySize).toBe(1);
    expect(result.explicitFields).not.toContain('gender');
    expect(result.reply).not.toMatch(/забронировал|сохранено|девушки любят/u);
  });

  it('inherits a date request and reads explicit day/food/time/group budget from the follow-up', () => {
    const result = run('В субботу кафе, 15 000 тенге на двоих, 2 часа', [user('Хочу девушку сводить на свидание'), assistant('What day?')]);
    expect(result.action).toBe('retrieve'); expect(result.intent).toBe('date');
    expect(result.context).toMatchObject({ goal: 'food', budget: 15000, partySize: 2, budgetBasis: 'group', minutes: 120 });
    expect(result.retrievalText).toContain('2026-10-24');
    expect(result.retrievalText).not.toMatch(/девушк|свидани/u);
  });

  it('does not loop when the missing budget answer explicitly says not important', () => {
    const history = [user('Хочу на свидание'), assistant('Что вам ближе? На какой день?'), user('Завтра ужин'), assistant('Какой бюджет?')];
    const result = run('Неважно', history);
    expect(result.action).toBe('retrieve'); expect(result.questions).toEqual([]);
    expect(result.context.budget).toBeNull(); expect(result.context.strictBudget).toBe(false);
    expect(result.retrievalText).toContain('2026-10-22'); expect(result.context.goal).toBe('food');
  });

  it('lets a bare number answer the budget question only in a matching pending dialogue', () => {
    const result = run('12000', [user('Хочу на свидание завтра, ужин'), assistant('Бюджет?')]);
    expect(result.context.budget).toBe(12000); expect(result.action).toBe('retrieve');
    expect(run('12000').context.budget).toBeNull();
  });

  it('uses only user messages, never an assistant-injected budget/day/format', () => {
    const result = run('Хочу на свидание', [assistant('Завтра ресторан, 50000 тенге на двоих. Бюджет сохранён.')]);
    expect(result.context.budget).toBeNull(); expect(result.context.partySize).toBe(1);
    expect(result.questions.map(q => q.field)).toEqual(['format', 'date']);
  });

  it('answers a greeting warmly without forced conditions or a provider', () => {
    const result = run('Привет!');
    expect(result.action).toBe('clarify'); expect(result.intent).toBe('general'); expect(result.questions).toEqual([]);
    expect(result.reply).toContain('Помогу'); expect(result.reply).not.toMatch(/бюджет|сколько времени/u);
  });

  it('does not delay a concrete food request to ask needless dating conditions', () => {
    const result = run('Хочу японский рамен до 5000 тенге');
    expect(result.action).toBe('retrieve'); expect(result.questions).toEqual([]);
    expect(result.context).toMatchObject({ goal: 'food', budget: 5000, strictBudget: true });
    expect(result.retrievalText).toContain('рамен');
  });

  it('preserves strict thousands budgets without making unknown prices free', () => {
    const result = run('На свидание завтра в кафе, до 15 тысяч на двоих');
    expect(result.context).toMatchObject({ budget: 15000, strictBudget: true, partySize: 2, budgetBasis: 'group' });
    expect(parseContext('Не бесплатно, до 10000 тенге', context()).budget).toBe(10000);
  });

  it('resets old-topic dialogue conditions with an explicit new request', () => {
    const result = run('А теперь просто кофе', [user('Хочу на свидание завтра. Без балета. До 3000 тенге'), assistant('Что предпочитаете?')]);
    expect(result.reset).toBe(true); expect(result.historyUsed).toBe(0);
    expect(result.context.budget).toBeNull(); expect(result.excludedTags).toEqual([]);
    expect(result.retrievalText).not.toContain('2026-10-22'); expect(result.intent).toBe('food');
  });

  it('does not silently relax a confirmed settings budget when the topic changes', () => {
    const result = prepareLeisureDialogue({ text: 'А теперь кофе', history: [user('Завтра театр')],
      context: { ...context(), budget: 2000, strictBudget: true }, now });
    expect(result.context).toMatchObject({ budget: 2000, strictBudget: true });
  });

  it('preserves negative interests over short follow-ups and excludes matching candidates', () => {
    const result = run('На завтра', [user('Хочу концерт, без балета'), assistant('На какой день?')]);
    expect(result.excludedTags).toContain('ballet'); expect(result.retrievalText).toContain('без балет');
    const items = [{ name: 'SYNTHETIC TEST балет', category: 'ballet' }, { name: 'SYNTHETIC TEST рок', category: 'concert' }];
    expect(filterDialogueCandidates(items, result)).toEqual([items[1]]);
  });

  it('allows an explicit later positive choice to replace that exclusion', () => {
    const result = run('Теперь можно балет', [user('Концерт, без балета')]);
    expect(result.excludedTags).not.toContain('ballet'); expect(result.retrievalText).toContain('балет');
  });

  it('uses the latest date, not the obsolete date left in a previous query', () => {
    const result = run('24 октября', [user('Хочу концерт 23 октября')]);
    expect(result.retrievalText).toContain('24 октября'); expect(result.retrievalText).not.toContain('23 октября');
  });

  it('keeps named interests and does not replace unsupported activities with theatre', () => {
    const result = run('Хочу концерт группы Ленинград, завтра');
    expect(result.retrievalText).toContain('Ленинград');
    expect(run('Хочу армрестлинг').retrievalText).toContain('армрестлинг');
  });

  it('redacts decimal GPS in replay and retrieval text; does not add a location', () => {
    const result = run('Кофе рядом с 51.12345, 71.54321');
    expect(result.retrievalText).not.toContain('51.12345'); expect(result.retrievalText).not.toContain('71.54321');
    expect(result.context.origin).toBeNull();
  });

  it('uses bounded recent history only', () => {
    const result = run('Кофе', [user('До 99999 тенге'), ...Array.from({ length: 24 }, () => assistant('SYNTHETIC TEST'))]);
    expect(result.historyUsed).toBe(0); expect(result.context.budget).toBeNull();
  });

  it('supports EN dating then an explicit Friday dinner budget answer', () => {
    expect(run('I want to take my girlfriend on a date', [], 'en').questions.map(q => q.field)).toEqual(['format', 'date']);
    const result = run('Dinner on Friday, 15000 KZT for everyone, two people', [user('I want to take my girlfriend on a date')], 'en');
    expect(result.action).toBe('retrieve'); expect(result.retrievalText).toContain('2026-10-23');
    expect(result.context).toMatchObject({ goal: 'food', budget: 15000, budgetBasis: 'group', partySize: 2 });
    expect(result.reply).toContain('conditions');
  });

  it('supports KK dating, exact Monday instead of accidental Saturday suffix, and money opt-out', () => {
    const first = run('Кездесу үшін көмектесіңіз', [], 'kk');
    expect(first.questions.map(q => q.field)).toEqual(['format', 'date']);
    const result = run('Дүйсенбіде кафе. Бюджет маңызды емес', [user('Кездесу үшін көмектесіңіз')], 'kk');
    expect(result.action).toBe('retrieve'); expect(result.retrievalText).toContain('2026-10-26');
    expect(result.context).toMatchObject({ goal: 'food', budget: null, strictBudget: false });
    expect(result.reply).toContain('Шарттарыңызға');
  });

  it('recognizes Kazakh suffix negation and English budget opt-out', () => {
    expect(run('Балет емес, концерт').excludedTags).toContain('ballet');
    const result = run('No budget limit', [user('A date tomorrow, dinner')], 'en');
    expect(result.action).toBe('retrieve'); expect(result.context.budget).toBeNull();
  });

  it('keeps walk intent through the actual baseline reparse with a negative food word', async () => {
    const dialogue = run('Парк без кофе');
    expect(dialogue.context.goal).toBe('walk');
    const result = await answerPilotChatWithEvents(dialogue.retrievalText, dialogue.context, { getEvents: async () => { throw new Error('No event source needed'); } });
    expect(result.proposedContext.goal).toBe('walk');
    expect(result.items.length).toBeGreaterThan(0);
    expect(filterDialogueCandidates(result.items, dialogue).every(item => item.category === 'park' || item.category === 'garden')).toBe(true);
    expect(answerPilotChat('Музей, не хочу кофе', context()).proposedContext.goal).toBe('activity');
  });

  it('preserves money scope, explicit party size and person-vs-group answers without assuming a couple', () => {
    expect(parseContext('10000 тенге на двоих', context())).toMatchObject({ budget: 10000, partySize: 2, budgetBasis: 'group' });
    expect(parseContext('10000 KZT for two', context())).toMatchObject({ budget: 10000, partySize: 2, budgetBasis: 'group' });
    expect(parseContext('Нас 2, 10000 тенге на всех', context())).toMatchObject({ budget: 10000, partySize: 2, budgetBasis: 'group' });
    expect(parseContext('На 2 часа, 5000 тенге на человека', context())).toMatchObject({ minutes: 120, partySize: 1, budgetBasis: 'person' });
    expect(parseContext('Dinner for two hours', context())).toMatchObject({ minutes: 120, partySize: 1, budgetBasis: 'person' });
    expect(run('Хочу на свидание').context.partySize).toBe(1);
  });

  it('uses a corrected cuisine without retaining the obsolete positive cuisine', () => {
    const dialogue = run('Нет, лучше итальянскую', [user('Хочу корейскую еду')]);
    expect(dialogue.context.goal).toBe('food');
    expect(dialogue.retrievalText).toContain('итальянскую'); expect(dialogue.retrievalText).not.toContain('корейскую');
    expect(run('Подбери места по моим условиям').action).toBe('retrieve');
  });

  it.each([
    ['На два часа в парк', 120], ['one hour for dinner', 60], ['екі сағат серуен', 120],
    ['Полчаса на кофе', 30], ['half an hour for coffee', 30], ['жарты сағат серуен', 30],
    ['Полтора часа в музей', 90], ['one and a half hours for dinner', 90], ['бір жарым сағат серуен', 90],
  ])('reads human duration %s without inventing a visit or route time', (text, expected) => {
    const result = prepareLeisureDialogue({ text, context: { ...context(), minutes: 300 }, now });
    expect(result.context.minutes).toBe(expected); expect(result.explicitFields).toContain('minutes');
    expect(result.context.origin).toBeNull();
  });
});
