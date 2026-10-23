import type { PilotContext } from "./contracts";
import { pilotPlaces, searchPilotPlaces } from "./catalog";
import { requestedFoodMatch } from "./food-search";
import type { LiveEventsResult } from "../ingestion/live-events";
import type { LiveAstanaEvent } from "../ingestion/sxodim-live";
import { retrieveEventEvidence, type EventEvidence } from "../ingestion/event-evidence";
import { isNegatedMention } from "../retrieval/lexical-query";

export function parseContext(text: string, context: PilotContext): PilotContext {
  const value = text.toLocaleLowerCase("ru-RU");
  const result = { ...context, likedTags: [...context.likedTags] };
  const positive = (pattern: RegExp) => [...value.matchAll(new RegExp(pattern.source, "giu"))]
    .some(match => !isNegatedMention(value, match));
  if (positive(/кофе\p{L}*|кафе|поесть|ресторан\p{L}*|(?:^|[^\p{L}])еда(?=$|[^\p{L}])|coffee|food|тамақ|жегім|ас іш|донер|шаурм\p{L}*|рамен|рамэн|суши|пицц\p{L}*|бургер\p{L}*|restaurant|dinner|lunch|ramen|sushi|pizza|burger/u)) result.goal = "food";
  else if (positive(/прогул\p{L}*|погуля\p{L}*|парк\p{L}*|walk|саябақ\p{L}*|серуен\p{L}*/u)) result.goal = "walk";
  else if (positive(/музей|театр\p{L}*|концерт\p{L}*|спектак\p{L}*|лекци\p{L}*|событи\p{L}*|афиш\p{L}*|выстав\p{L}*|кино|museum|theat\p{L}*|көрме\p{L}*/u)) result.goal = "activity";
  else if (positive(/новое|необыч\p{L}*|new|жаңа/u)) result.goal = "new";
  const hours = value.match(/(?:на\s*)?(\d+(?:[.,]\d+)?)\s*(?:час(?:а|ов)?|сағат|hours?)(?:\s|$|[,.!?])/u);
  const minutes = value.match(/(\d{1,3})\s*(?:мин(?:ут(?:ы)?)?|minutes?)(?:\s|$|[,.!?])/u);
  const hourWords: Record<string, number> = { один: 1, одна: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, бір: 1, екі: 2, үш: 3, төрт: 4, бес: 5, алты: 6 };
  const spelledHours = [...value.matchAll(/(?<!\p{L})(один|одна|два|две|три|четыре|пять|шесть|one|two|three|four|five|six|бір|екі|үш|төрт|бес|алты)\s+(?:час(?:а|ов)?|hours?|сағат)(?=$|[^\p{L}])/gu)].at(-1);
  const halfHour = /полчаса|half\s+an\s+hour|жарты\s+сағат/u.test(value);
  const oneAndHalfHours = /полтора\s+часа|one\s+and\s+a\s+half\s+hours?|бір\s+жарым\s+сағат/u.test(value);
  const amount = value.match(/(\d{1,7}(?:[\s.,]\d{3})*)\s*(?:₸|тг|тенге|теңге|kzt)(?:\s|$|[,.!?])/u);
  if (hours) result.minutes = Math.min(720, Math.max(20, Math.round(Number(hours[1].replace(",", ".")) * 60)));
  else if (minutes) result.minutes = Math.min(720, Math.max(20, Number(minutes[1])));
  else if (oneAndHalfHours) result.minutes = 90;
  else if (halfHour) result.minutes = 30;
  else if (spelledHours) result.minutes = hourWords[spelledHours[1]] * 60;
  if (positive(/бесплат\p{L}*|тегін|\bfree\b/u)) { result.budget = 0; result.strictBudget = true; }
  else if (amount) {
    result.budget = Math.min(1_000_000, Number(amount[1].replace(/[\s.,]/g, "")));
    if (/(?:до|не больше|не более|максимум|up to|at most)\s*\d[\d\s.,]*(?:₸|тг|тенге|теңге|kzt)/u.test(value)) result.strictBudget = true;
  }
  else if (/бюджет не знаю|без ограничения бюджета|budget unknown/u.test(value)) result.budget = null;
  if (/нас\s+(?:двое|два)|мы\s+вдво[её]м|на\s+двоих|two\s+(?:of\s+us|people)|for\s+two(?!\s+(?:hours?|minutes?|days?))|екеуміз/u.test(value)) result.partySize = 2;
  else if (/нас\s+трое|на\s+троих|three\s+(?:of\s+us|people)|үшеуміз/u.test(value)) result.partySize = 3;
  const party = value.match(/нас\s+(\d{1,2})(?=$|[^\d])|на\s+(\d{1,2})\s+человек|for\s+(\d{1,2})\s+(?:people|persons?|guests?)/u);
  const partyNumber = party ? Number(party[1] ?? party[2] ?? party[3]) : null;
  if (partyNumber !== null && partyNumber >= 1 && partyNumber <= 20) result.partySize = partyNumber;
  if (/на\s+(?:двоих|троих|всех)|общий\s+бюджет|total\s+budget|for\s+(?:everyone|(?:two|three)(?!\s+(?:hours?|minutes?|days?)))|екеумізге|үшеумізге|бәрімізге|барлығына|жалпы\s+(?:бюджет\s*)?\d/u.test(value)) result.budgetBasis = "group";
  else if (/на\s+человека|per\s+person|адам\s+басына/u.test(value)) result.budgetBasis = "person";
  return result;
}

const cinemaQuery = /кино|фильм|кинозал|movie|cinema/u;
const eventQuery = /концерт|спектак|балет|лекци|квиз|стендап|выстав|мастер.класс|событи|мероприят|сегодня|завтра|афиш|concert|lecture|\btoday\b|\bevents?\b|\bquiz\b|қойылым|дәріс|көрме/u;

/** Category selector must not read an explicitly rejected noun as a request.
 * Original text still goes to money/time and food/event exclusion filters.
 */
export function positiveCategoryQuery(text: string): string {
  return text.replace(/(?:^|[^\p{L}])(?:без|не|not|no|without)\s+(?:(?:хочу|хотим|нужен|нужны|want|like|в|на|the|a)\s+){0,3}(?:кофе\p{L}*|кафе|coffee|caf[eé]|музе\p{L}*|museum\p{L}*|мұражай\p{L}*|театр\p{L}*|спектак\p{L}*|theat\p{L}*|парк\p{L}*|park\p{L}*|саябақ\p{L}*)/giu, ' ')
    .replace(/(?:кафе|coffee|музе\p{L}*|museum\p{L}*|мұражай\p{L}*|театр\p{L}*|парк\p{L}*|саябақ\p{L}*)\s+(?:емес|керек\s+емес)(?=$|[^\p{L}])/giu, ' ');
}

export function filterChatEvents(events: LiveAstanaEvent[], text: string, context: PilotContext, now = Date.now()) {
  return retrieveEventEvidence({ items: events, dataMode: "snapshot", freshness: "stale", cacheStatus: "hit", fetchedAt: null, expiresAt: null, source: null, coverage: null, warnings: [] }, text, context, now).items;
}

/** The only network dependency is the fixed-source, hourly cached service passed by the route. */
export async function answerPilotChatWithEvents(text: string, context: PilotContext, options: { getEvents: () => Promise<LiveEventsResult>; now?: () => number; forceEvents?: boolean; semanticText?: string }) {
  const base = answerPilotChat(text, context);
  const query = text.toLocaleLowerCase("ru-RU");
  if (cinemaQuery.test(query) || !options.forceEvents && !eventQuery.test(query)) return { ...base, events: [] as LiveAstanaEvent[], eventEvidence: [] as EventEvidence[], eventsMeta: null };
  const now = options.now?.() ?? Date.now();
  let data: LiveEventsResult;
  try { data = await options.getEvents(); }
  catch {
    data = { dataMode: "unavailable", freshness: "unavailable", cacheStatus: "miss", fetchedAt: null, expiresAt: null, source: null, coverage: null, items: [], warnings: ["Не удалось проверить афишу. События не выдумываются."] };
  }
  // Preserve the original explicit preference mode even when parsing the event noun proposes activity.
  const retrieval = retrieveEventEvidence(data, text, { ...base.proposedContext, goal: context.goal }, now, { semanticText: options.semanticText });
  const events = retrieval.items;
  const firstDate = events.length ? new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(events[0].startsAt)) : null;
  return {
    ...base, items: [], events, eventEvidence: retrieval.evidence, eventRetrieval: { constraints: retrieval.constraints, excludedCount: retrieval.excluded.length },
    eventsMeta: { dataMode: data.dataMode, freshness: data.freshness, fetchedAt: data.fetchedAt, expiresAt: data.expiresAt, cacheStatus: data.cacheStatus, warnings: data.warnings },
    reply: events.length
      ? `В афише нашёл ${events.length} ${events.length === 1 ? "событие" : events.length < 5 ? "события" : "событий"}. Ближайшее — ${firstDate}, время Астаны. Наличие мест, итоговую цену и время пути нужно уточнить.`
      : data.dataMode === "unavailable"
        ? "Афиша сейчас недоступна. Я не буду придумывать события или заменять их похожими местами. Попробуйте обновить поиск позже."
        : "В доступной афише не нашёл событий по этому запросу и условиям. Дату, бюджет и интересы автоматически не меняю. Покрытие афиши пока ограничено.",
    steps: [
      { id: "context", label: "Разобраны явные условия запроса", status: "completed" },
      { id: "retrieval", label: data.dataMode === "unavailable" ? "Источник афиши недоступен" : `Проверена афиша: ${data.dataMode === "live" ? "актуальный кэш" : "сохранённый снимок"}`, status: "completed" },
      { id: "constraints", label: "Проверены дата в Астане, известная цена и соответствие интересам", status: "completed" },
    ],
    warnings: ["Без внешнего AI: ответ сформирован правилами по данным афиши. Это не генеративный RAG.", "Условия из текста предложены к подтверждению, а не сохранены автоматически.", "Время пути, язык события, длительность и итоговая стоимость могут быть неизвестны. Наличие билетов уточните у организатора.", ...data.warnings],
  };
}

export function answerPilotChat(text: string, context: PilotContext) {
  const proposedContext = parseContext(text, context);
  const unsupported = /кино|фильм|кинозал|movie|cinema|концерт|билет|concert/u.test(text.toLocaleLowerCase("ru-RU"));
  const unavailableActivity = /баня|сауна|шашлык|барабан|бачат|армрестл|армресл|гончар|керамик/u.test(text.toLocaleLowerCase("ru-RU"));
  const candidates = proposedContext.goal === "food" ? pilotPlaces.filter(place => requestedFoodMatch(place, text)) : pilotPlaces;
  const items = unsupported || unavailableActivity ? [] : searchPilotPlaces(proposedContext, positiveCategoryQuery(text), candidates);
  return {
    generationMode: "deterministic" as const,
    reply: unsupported
      ? "В каталоге пока нет подтверждённых сеансов кино и расписаний концертов. Я не буду придумывать фильмы, время или свободные билеты. Можно посмотреть места на карте или изменить запрос."
      : unavailableActivity
        ? "В сохранённом каталоге пока нет подтверждённых предложений по этому занятию. Не буду заменять ваш интерес другим без согласия. Можно изменить запрос или посмотреть доступные места на карте."
      : items.length
        ? `Нашёл ${items.length} ${items.length === 1 ? "место" : "места"} по выбранной категории.${proposedContext.origin ? " Показал только варианты, укладывающиеся в приблизительный расчёт времени." : " Укажите точку старта, чтобы оценить дорогу."} Цены, расписание и запись нужно уточнить перед посещением.`
        : "Не нашёл подходящих мест в сохранённом каталоге с такими условиями. Можно изменить категорию, время или строгий бюджет — ограничения сами не ослабляю.",
    proposedContext, items,
    steps: [
      { id: "context", label: "Разобраны цель, время и бюджет по явным словам запроса", status: "completed" },
      { id: "retrieval", label: unsupported ? "Проверено отсутствие подключённого каталога сеансов" : "Проверен локальный каталог мест Астаны", status: "completed" },
      { id: "constraints", label: proposedContext.origin ? "Время и бюджет проверены кодом; маршрут остаётся оценкой" : "Бюджет проверен; расчёт пути ждёт точки старта", status: "completed" },
    ],
    suggestions: ["Показать на карте", "Изменить условия", "Указать точку старта"],
    warnings: ["Без внешнего AI: ответ сформирован правилами и локальным поиском. Это не генеративный RAG.", "Условия из текста предложены к подтверждению, а не сохранены автоматически."],
  };
}
