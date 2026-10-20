import type { PilotContext } from '../pilot/contracts';
import { parseContext } from '../pilot/chat';
import { normalizeChatHistory, type RecentChatMessage } from '../pilot/chat-history';
import { redactDecimalCoordinates } from '../pilot/location-redaction';

export type DialogueLanguage = 'ru' | 'kk' | 'en';
export type DialogueQuestion = { field: 'format' | 'date' | 'budget'; text: string };
export type LeisureDialogue = {
  action: 'clarify' | 'retrieve'; reply: string; questions: DialogueQuestion[];
  intent: 'date' | 'food' | 'events' | 'places' | 'general'; context: PilotContext;
  retrievalText: string; explicitFields: string[]; excludedTags: string[];
  historyUsed: number; reset: boolean; warnings: string[];
};

const formats = [
  { key: 'food', goal: 'food', query: 'еда', pattern: /кофе|кофей\p{L}*|кафе|ресторан\p{L}*|ужин\p{L}*|поесть|ед[ау]|обед\p{L}*|суши|рамен|рамэн|пицц\p{L}*|бургер\p{L}*|донер|шаурм\p{L}*|coffee|caf[eé]|restaurant|dinner|lunch|food|sushi|ramen|pizza|burger|тамақ|кафе|кешкі\s+ас|түскі\s+ас/giu },
  { key: 'places', goal: 'walk', query: 'парк', pattern: /прогул\p{L}*|погуля\p{L}*|парк\p{L}*|сад(?:у|ом)?|walk\p{L}*|park\p{L}*|garden\p{L}*|серуен\p{L}*|саябақ\p{L}*/giu },
  { key: 'places', goal: 'activity', query: 'музей', pattern: /музе\p{L}*|museum\p{L}*|мұражай\p{L}*/giu },
  { key: 'events', goal: 'activity', query: 'события', pattern: /событи\p{L}*|мероприяти\p{L}*|афиш\p{L}*|концерт\p{L}*|театр\p{L}*|спектак\p{L}*|балет\p{L}*|кино|фильм\p{L}*|лекци\p{L}*|выстав\p{L}*|стендап\p{L}*|квиз\p{L}*|мастер[\s-]*класс\p{L}*|events?|concert\p{L}*|theat\p{L}*|ballet|cinema|movie\p{L}*|lecture\p{L}*|exhibition\p{L}*|stand[\s-]*up|quiz|workshop|іс[\s-]*шара\p{L}*|қойылым\p{L}*|көрме\p{L}*|дәріс\p{L}*/giu },
] as const;

const exclusions = [
  { tag: 'ballet', term: 'балет', pattern: /балет\p{L}*|ballet/giu, content: /балет|ballet/iu },
  { tag: 'theatre', term: 'театр', pattern: /театр\p{L}*|спектак\p{L}*|theat\p{L}*|қойылым\p{L}*/giu, content: /театр|спектак|theat|қойылым/iu },
  { tag: 'museum', term: 'музей', pattern: /музе\p{L}*|museum\p{L}*|мұражай\p{L}*/giu, content: /музе|museum|мұражай/iu },
  { tag: 'park', term: 'парк', pattern: /парк\p{L}*|park\p{L}*|саябақ\p{L}*/giu, content: /парк|park|garden|саябақ/iu },
  { tag: 'cafe', term: 'кофе', pattern: /кофе\p{L}*|кафе|coffee|caf[eé]/giu, content: /кофе|кафе|coffee|cafe/iu },
  { tag: 'rock', term: 'рок', pattern: /(?:^|[^\p{L}])(?:рок|rock|metal)(?=[^\p{L}]|$)/giu, content: /рок|rock|metal/iu },
] as const;
type FormatChoice = { key: 'food' | 'events' | 'places'; goal: PilotContext['goal']; query: string; pattern: RegExp };
const dateIntent = /свидани\p{L}*|романтич\p{L}*|\b(?:a\s+date|date\s+night|dating|romantic)\b|кездесу|романтик/iu;
const resetPattern = /(?:^|[.!?]\s*|\s)(?:а\s+теперь|теперь\s+лучше|новый\s+запрос|начн[её]м\s+заново|передумал\p{L}*|now\s+instead|new\s+request|start\s+over|енді\s+|жаңа\s+сұрау)/iu;
const greeting = /^(?:привет|здравствуй(?:те)?|добрый\s+(?:день|вечер)|hello|hi|hey|сәлем(?:етсіз\s+бе)?)[\s!?.]*$/iu;
const vague = /куда\s+(?:сходить|пойти)|не\s+знаю\s+(?:куда|чего)|чем\s+заняться|what\s+(?:can|should)\s+(?:i|we)\s+do|қайда\s+бар|не\s+істе/iu;
const budgetOptOut = /(?:бюджет|цена|деньги)\s+(?:не\s*важ\p{L}*|любо\p{L}*|без\s+огранич\p{L}*)|без\s+ограничения\s+бюджета|любой\s+бюджет|budget\s+(?:doesn'?t\s+matter|unknown|unlimited|not\s+important)|no\s+(?:fixed\s+)?budget\s+limit|unlimited\s+budget|бюджет\s+(?:маңызды\s+емес|шектеусіз)/iu;
const indifferent = /^(?:не\s*важно|без\s+разницы|любое|любой|любая|не\s+знаю|doesn'?t\s+matter|anything|any|бәрібір|маңызды\s+емес)[.!?\s]*$/iu;
const amount = /\d[\d\s.,]*(?:₸|тг|тенге|теңге|kzt)|\d+(?:[.,]\d+)?\s*(?:тыс(?:яч)?|k)\s*(?:₸|тг|тенге|теңге|kzt)?/iu;
const duration = /\d+(?:[.,]\d+)?\s*(?:час\p{L}*|мин\p{L}*|hours?|minutes?|сағат|минут)|(?:один|одна|два|две|три|четыре|пять|шесть|one|two|three|four|five|six|бір|екі|үш|төрт|бес|алты|жарты)\s+(?:час\p{L}*|hours?|сағат)|полчаса|полтора\s+часа|half\s+an\s+hour|one\s+and\s+a\s+half\s+hours?|бір\s+жарым\s+сағат/iu;
const cuisine = /япон\p{L}*|жапон\p{L}*|japan\p{L}*|корей\p{L}*|кор[её]й\p{L}*|korean|кәріс\p{L}*|итал\p{L}*|italian|индий\p{L}*|indian|үнді\p{L}*|китай\p{L}*|chinese|қытай\p{L}*|веган\p{L}*|vegan|вегетариан\p{L}*|vegetarian/giu;
const negative = (text: string, position: number, end = position) => /(?:^|[^\p{L}])(?:без|не|no|not|without|емес)\s+(?:(?:хочу|хотим|нуж\p{L}*|нравится|want|like)\s+)?$/iu.test(text.slice(0, position))
  || /^\s+(?:емес|керек\s+емес)(?=$|[^\p{L}])/iu.test(text.slice(end));

function dayQuery(text: string, now: number): string | null {
  const local = new Date(now + 5 * 3_600_000), day = local.toISOString().slice(0, 10);
  const plus = (days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  const explicit = [...text.matchAll(/20\d{2}-\d{2}-\d{2}|\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s+20\d{2})?/giu)].at(-1)?.[0];
  if (explicit) return explicit;
  const relative = [
    { pattern: /послезавтра/giu, value: plus(2) }, { pattern: /завтра|\btomorrow\b|ертең/giu, value: plus(1) },
    { pattern: /сегодня|сейчас|\btoday\b|\bright now\b|бүгін|қазір/giu, value: day },
    { pattern: /выходн\p{L}*|\bweekend\b|демалыс\s+күн/giu, value: 'выходные' },
  ].flatMap(entry => [...text.matchAll(entry.pattern)].filter(match => !negative(text, match.index!)).map(match => ({ position: match.index!, value: entry.value })));
  // Avoid treating the suffix «завтра» in «послезавтра» as tomorrow.
  if (/послезавтра/iu.test(text)) return plus(2);
  const weekdays = [
    /(?<!\p{L})(?:воскресень\p{L}*|sunday|жексенбі(?:де)?)(?!\p{L})/giu, /(?<!\p{L})(?:понедельник\p{L}*|monday|дүйсенбі(?:де)?)(?!\p{L})/giu,
    /(?<!\p{L})(?:вторник\p{L}*|tuesday|сейсенбі(?:де)?)(?!\p{L})/giu, /(?<!\p{L})(?:сред[ау]|wednesday|сәрсенбі(?:де)?)(?!\p{L})/giu,
    /(?<!\p{L})(?:четверг\p{L}*|thursday|бейсенбі(?:де)?)(?!\p{L})/giu, /(?<!\p{L})(?:пятниц\p{L}*|friday|жұма(?:да)?)(?!\p{L})/giu,
    /(?<!\p{L})(?:суббот\p{L}*|saturday|сенбі(?:де)?)(?!\p{L})/giu,
  ].flatMap((pattern, weekday) => [...text.matchAll(pattern)].filter(match => !negative(text, match.index!))
    .map(match => ({ position: match.index!, value: plus((weekday - local.getUTCDay() + 7) % 7) })));
  return [...relative, ...weekdays].sort((a, b) => a.position - b.position).at(-1)?.value ?? null;
}

const labels = {
  ru: { greeting: 'Привет! Помогу выбрать прогулку, место для встречи, ужин или событие в Астане. Что вам хочется?',
    lead: 'Помогу подобрать варианты. ', format: 'Что вам ближе: прогулка, ужин или событие?', date: 'На какой день планируете?',
    budget: 'Какой бюджет в тенге, на человека или на всех? Можно без ограничения.', ready: 'Посмотрю варианты по вашим условиям. Цены, расписание и доступность проверяем по карточкам, а неизвестное не угадываем.' },
  kk: { greeting: 'Сәлем! Астанада серуен, кездесу орны, кешкі ас немесе іс-шара таңдауға көмектесемін. Не қалайсыз?',
    lead: 'Нұсқаларды таңдауға көмектесемін. ', format: 'Серуен, кешкі ас әлде іс-шара — қайсысы ұнайды?', date: 'Қай күнге жоспарлап отырсыз?',
    budget: 'Бюджетіңіз теңгемен қанша: бір адамға ма, әлде барлығына ма? Шектеусіз де болады.', ready: 'Шарттарыңызға сай нұсқаларды қараймын. Баға, кесте және қолжетімділік карточкадағы дерекпен тексеріледі; белгісізі ойдан қосылмайды.' },
  en: { greeting: 'Hi! I can help with a walk, a place to meet, dinner or an event in Astana. What would you like?',
    lead: 'I can help narrow it down. ', format: 'Would you prefer a walk, dinner or an event?', date: 'Which day are you planning for?',
    budget: 'What is your budget in tenge, per person or for everyone? No limit is fine too.', ready: 'I will look for options matching your conditions. Prices, schedules and availability come from the cards; unknown facts stay unknown.' },
};

function searchTerms(text: string) {
  return text
    .replace(/\[координат[аы]\s+(?:скрыт[аы]|удален[аы])\]/giu, ' ')
    .replace(/(?<!\p{L})(?:хочу|хотим|помоги|пожалуйста|найди|подбери|посоветуй|можно|лучше|только|для|нас|нам|мне|мы|группы|на\s+двоих|на\s+всех)(?!\p{L})/giu, ' ')
    .replace(/своди\p{L}*|свидани\p{L}*|девушк\p{L}*|парня|партн[её]р\p{L}*|романтич\p{L}*|спокойно\s+поговорить|романтик\p{L}*|кездесу\p{L}*/giu, ' ')
    .replace(/i\s+(?:want|would\s+like)|take\s+(?:my\s+)?(?:girlfriend|boyfriend|partner)|\bon\s+a\s+date\b|\bromantic\b|өтінемін|қалаймын/giu, ' ')
    .replace(/20\d{2}-\d{2}-\d{2}|\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s+20\d{2})?|\d+(?:[.,]\d+)?\s*(?:час\p{L}*|мин\p{L}*|hours?|minutes?|сағат|минут)|\d[\d\s.,]*(?:₸|тг|тенге|теңге|kzt)|\d+\s*тыс\p{L}*/giu, ' ')
    .replace(/полчаса|полтора\s+часа|one\s+and\s+a\s+half\s+hours?|half\s+an\s+hour|бір\s+жарым\s+сағат|(?<!\p{L})(?:один|одна|два|две|три|четыре|пять|шесть|one|two|three|four|five|six|бір|екі|үш|төрт|бес|алты|жарты)\s+(?:час\p{L}*|hours?|сағат)/giu, ' ')
    .replace(/(?:сегодня|послезавтра|завтра|выходн\p{L}*|понедельник\p{L}*|вторник\p{L}*|сред[ау]|четверг\p{L}*|пятниц\p{L}*|суббот\p{L}*|воскресень\p{L}*|\btoday\b|\btomorrow\b|\bweekend\b|\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\b|бүгін|ертең|қазір|дүйсенбі|сейсенбі|сәрсенбі|бейсенбі|жұма|сенбі|жексенбі)/giu, ' ')
    .replace(/а\s+теперь|новый\s+запрос|now\s+instead|new\s+request|енді|не\s*важно|без\s+разницы|doesn'?t\s+matter|бәрібір/giu, ' ')
    .replace(/\s+/gu, ' ').trim();
}

/** Stateless replay of bounded USER turns. No DB writes, provider requests or
 * inferred identity/relationship/profile. Assistant messages are never facts.
 * Confirmed settings remain constraints; topic reset only clears dialogue replay.
 */
export function prepareLeisureDialogue(input: { text: string; history?: unknown; context: PilotContext; language?: DialogueLanguage; now?: number }): LeisureDialogue {
  const language = input.language ?? 'ru', copy = labels[language], now = input.now ?? Date.now();
  const current = redactDecimalCoordinates(input.text, '[координаты скрыты]').slice(0, 1000);
  const normalized: RecentChatMessage[] = normalizeChatHistory(input.history);
  let history = normalized.filter(message => message.role === 'user').map(message => message.text);
  const reset = resetPattern.test(current);
  if (reset) history = [];
  else { const last = history.findLastIndex(text => resetPattern.test(text)); if (last >= 0) history = history.slice(last); }
  const turns = [...history, current];
  let context: PilotContext = { ...input.context, likedTags: [...input.context.likedTags] };
  let intent: LeisureDialogue['intent'] = 'general', romantic = false, format: FormatChoice | null = null;
  let date: string | null = null, dateKnown = false, budgetKnown = context.budget !== null;
  let query = '', pending: DialogueQuestion['field'][] = [];
  const explicit = new Set<string>(), excluded = new Set<string>();
  const missing = (): DialogueQuestion['field'][] => {
    if (!romantic && !turns.some(text => vague.test(text))) return [];
    return [...(!format ? ['format' as const] : []), ...(!dateKnown ? ['date' as const] : []),
      ...(format?.key === 'food' && !budgetKnown ? ['budget' as const] : [])];
  };
  for (const turn of turns) {
    romantic ||= dateIntent.test(turn);
    if (romantic) intent = 'date';
    const positives = formats.flatMap(entry => [...turn.matchAll(new RegExp(entry.pattern.source, entry.pattern.flags))]
      .filter(match => !negative(turn, match.index!, match.index! + match[0].length)).map(match => ({ entry, position: match.index! })));
    const selected = positives.sort((a, b) => a.position - b.position).at(-1)?.entry;
    if (selected) { format = selected; context.goal = selected.goal; explicit.add('format'); if (!romantic) intent = selected.key; }
    const positiveCuisine = [...turn.matchAll(new RegExp(cuisine.source, cuisine.flags))].some(match => !negative(turn, match.index!, match.index! + match[0].length));
    if (positiveCuisine && !selected) { format = formats[0]; context.goal = 'food'; explicit.add('format'); if (!romantic) intent = 'food'; }
    for (const entry of exclusions) for (const match of turn.matchAll(new RegExp(entry.pattern.source, entry.pattern.flags))) {
      if (negative(turn, match.index!, match.index! + match[0].length)) excluded.add(entry.tag); else excluded.delete(entry.tag);
    }
    const positiveText = turn.replace(/(?:без|не|without|not|no)\s+(?:(?:хочу|want)\s+)?(?:балет\p{L}*|кофе\p{L}*|кафе|музе\p{L}*|театр\p{L}*|парк\p{L}*|coffee|ballet|theat\p{L}*|museum\p{L}*|park\p{L}*)/giu, ' ');
    context = parseContext(positiveText, context);
    const day = dayQuery(turn, now);
    if (day) { date = day; dateKnown = true; explicit.add('date'); }
    if (/любой\s+день|день\s+не\s*важ\p{L}*|any\s+day|күн\s+маңызды\s+емес/iu.test(turn)) { date = null; dateKnown = true; explicit.add('date'); }
    if (amount.test(turn)) {
      const thousands = turn.match(/(\d+(?:[.,]\d+)?)\s*(?:тыс(?:яч)?|k)(?=\s|$|[₸,.!?])/iu);
      if (thousands) context = parseContext(`${/(?:до|максимум|up to|at most)/iu.test(turn) ? 'до ' : ''}${Math.round(Number(thousands[1].replace(',', '.')) * 1000)} тенге`, context);
      budgetKnown = true; explicit.add('budget');
    }
    if (duration.test(turn)) explicit.add('minutes');
    if (budgetOptOut.test(turn) || indifferent.test(turn) && pending.includes('budget')) { context.budget = null; context.strictBudget = false; budgetKnown = true; explicit.add('budget'); }
    if (indifferent.test(turn) && pending.includes('date')) { date = null; dateKnown = true; explicit.add('date'); }
    if (indifferent.test(turn) && pending.includes('format')) { format = { ...formats[1], goal: 'new', query: 'досуг' }; context.goal = 'new'; explicit.add('format'); }
    if (pending.includes('budget') && /^\d{1,6}$/u.test(turn.trim())) { context = parseContext(`${turn} тенге`, context); budgetKnown = true; explicit.add('budget'); }
    const terms = searchTerms(positiveText);
    if (selected || positiveCuisine) query = terms || selected?.query || 'еда';
    else if (terms && !amount.test(turn) && !duration.test(turn) && !indifferent.test(turn) && !budgetOptOut.test(turn) && !day) query = `${query} ${terms}`.trim();
    pending = missing().slice(0, 2);
  }
  const genericGreeting = greeting.test(current);
  if (genericGreeting) { intent = 'general'; pending = []; }
  const questions = pending.map(field => ({ field, text: copy[field] }));
  const action = genericGreeting || questions.length ? 'clarify' : 'retrieve';
  const excludes = exclusions.filter(entry => excluded.has(entry.tag));
  const retrievalText = [query || format?.query || current, ...excludes.map(entry => `без ${entry.term}`), date].filter(Boolean).join(' ').slice(0, 1000);
  return { action, reply: genericGreeting ? copy.greeting : questions.length ? copy.lead + questions.map(question => question.text).join(' ') : copy.ready,
    questions, intent, context, retrievalText, explicitFields: [...explicit], excludedTags: [...excluded],
    historyUsed: history.length, reset,
    warnings: romantic ? [language === 'ru' ? 'Атмосфера и пригодность места для свидания не подтверждены источником; это предпочтение, не факт о заведении.'
      : language === 'kk' ? 'Кездесуге лайық атмосфера дереккөзбен расталмаған; бұл орын туралы факт емес, талғам.'
        : 'A date-friendly atmosphere is a preference, not a verified venue fact.'] : [],
  };
}

export function filterDialogueCandidates<T extends { name: string; category?: string | null; tags?: readonly string[]; cuisines?: readonly string[] }>(items: readonly T[], dialogue: Pick<LeisureDialogue, 'excludedTags'>): T[] {
  return items.filter(item => !exclusions.some(entry => dialogue.excludedTags.includes(entry.tag)
    && entry.content.test([item.name, item.category ?? '', ...(item.tags ?? []), ...(item.cuisines ?? [])].join(' '))));
}
