import type { PilotContext } from "./contracts";
import { searchPilotPlaces } from "./catalog";
import type { LiveEventsResult } from "../ingestion/live-events";
import type { LiveAstanaEvent } from "../ingestion/sxodim-live";
import { retrieveEventEvidence, type EventEvidence } from "../ingestion/event-evidence";

export function parseContext(text: string, context: PilotContext): PilotContext {
  const value = text.toLocaleLowerCase("ru-RU");
  const result = { ...context, likedTags: [...context.likedTags] };
  if (/кофе|кафе|поесть|ресторан|еда|coffee|food|тамақ/u.test(value)) result.goal = "food";
  else if (/прогул|погуля|парк|walk|саябақ|серуен/u.test(value)) result.goal = "walk";
  else if (/музей|театр|концерт|спектак|лекци|событи|афиш|выстав|кино|museum|theat|көрме/u.test(value)) result.goal = "activity";
  else if (/новое|необыч|new|жаңа/u.test(value)) result.goal = "new";
  const hours = value.match(/(?:на\s*)?(\d+(?:[.,]\d+)?)\s*(?:час(?:а|ов)?|сағат|hours?)(?:\s|$|[,.!?])/u);
  const minutes = value.match(/(\d{1,3})\s*(?:мин(?:ут(?:ы)?)?|minutes?)(?:\s|$|[,.!?])/u);
  const amount = value.match(/(\d{1,7}(?:[\s.,]\d{3})*)\s*(?:₸|тг|тенге|kzt)(?:\s|$|[,.!?])/u);
  if (hours) result.minutes = Math.min(720, Math.max(20, Math.round(Number(hours[1].replace(",", ".")) * 60)));
  else if (minutes) result.minutes = Math.min(720, Math.max(20, Number(minutes[1])));
  if (/бесплат|тегін|\bfree\b/u.test(value)) { result.budget = 0; result.strictBudget = true; }
  else if (amount) {
    result.budget = Math.min(1_000_000, Number(amount[1].replace(/[\s.,]/g, "")));
    if (/(?:до|не больше|не более|максимум)\s*\d[\d\s.,]*(?:₸|тг|тенге|kzt)/u.test(value)) result.strictBudget = true;
  }
  else if (/бюджет не знаю|без ограничения бюджета|budget unknown/u.test(value)) result.budget = null;
  return result;
}

const cinemaQuery = /кино|фильм|кинозал|movie|cinema/u;
const eventQuery = /концерт|спектак|балет|лекци|квиз|стендап|выстав|мастер.класс|событи|мероприят|сегодня|завтра|афиш|concert|lecture|\btoday\b|\bevents?\b|\bquiz\b|қойылым|дәріс|көрме/u;

export function filterChatEvents(events: LiveAstanaEvent[], text: string, context: PilotContext, now = Date.now()) {
  return retrieveEventEvidence({ items: events, dataMode: "snapshot", freshness: "stale", cacheStatus: "hit", fetchedAt: null, expiresAt: null, source: null, coverage: null, warnings: [] }, text, context, now).items;
}

/** The only network dependency is the fixed-source, hourly cached service passed by the route. */
export async function answerPilotChatWithEvents(text: string, context: PilotContext, options: { getEvents: () => Promise<LiveEventsResult>; now?: () => number }) {
  const base = answerPilotChat(text, context);
  const query = text.toLocaleLowerCase("ru-RU");
  if (cinemaQuery.test(query) || !eventQuery.test(query)) return { ...base, events: [] as LiveAstanaEvent[], eventEvidence: [] as EventEvidence[], eventsMeta: null };
  const now = options.now?.() ?? Date.now();
  let data: LiveEventsResult;
  try { data = await options.getEvents(); }
  catch {
    data = { dataMode: "unavailable", freshness: "unavailable", cacheStatus: "miss", fetchedAt: null, expiresAt: null, source: null, coverage: null, items: [], warnings: ["Не удалось проверить афишу. События не выдумываются."] };
  }
  // Preserve the original explicit preference mode even when parsing the event noun proposes activity.
  const retrieval = retrieveEventEvidence(data, text, { ...base.proposedContext, goal: context.goal }, now);
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
  const items = unsupported || unavailableActivity ? [] : searchPilotPlaces(proposedContext, text);
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
