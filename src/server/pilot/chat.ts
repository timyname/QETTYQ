import type { PilotContext } from "./contracts";
import { searchPilotPlaces } from "./catalog";
import type { LiveEventsResult } from "../ingestion/live-events";
import type { LiveAstanaEvent } from "../ingestion/sxodim-live";

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
  else if (amount) result.budget = Math.min(1_000_000, Number(amount[1].replace(/[\s.,]/g, "")));
  else if (/бюджет не знаю|без ограничения бюджета|budget unknown/u.test(value)) result.budget = null;
  return result;
}

const cinemaQuery = /кино|фильм|кинозал|movie|cinema/u;
const eventQuery = /концерт|спектак|лекци|событи|мероприят|сегодня|афиш|concert|lecture|\btoday\b|\bevents?\b/u;
const rockQuery = /(?:^|[^\p{L}])(?:рок|rock|metal|метал|punk|панк)(?:[^\p{L}]|$)/u;

function localEventDate(instant: number | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
}

function eventSearchText(event: LiveAstanaEvent) {
  return `${event.name} ${event.category ?? ""} ${event.venueName ?? ""}`.toLocaleLowerCase("ru-RU");
}

function matchesEventPreferences(event: LiveAstanaEvent, context: PilotContext) {
  if (context.goal !== "new" || context.likedTags.length === 0) return true;
  const content = eventSearchText(event);
  const tags = context.likedTags;
  const matchers: Record<string, RegExp> = {
    culture: /культур|театр|спектак|музе|выстав|искус|балет|опера/u,
    museum: /музе|museum/u, theatre: /театр|спектак|theat/u, ballet: /балет|ballet/u,
    rock: rockQuery, live_music: /концерт|музык|concert/u,
    dance: /танц|dance|бачат/u, bachata: /бачат|bachata/u,
    drums: /барабан|drum/u, workshop: /мастер.класс|workshop/u,
    sport: /спорт|трениров|турнир|sport/u, armwrestling: /армрестл|армресл/u,
    active: /спорт|трениров|актив/u, sauna: /баня|сауна/u, country: /загород|country/u,
    shashlik: /шашлык/u, food: /еда|гастроном|дегустац/u, restaurant: /ресторан|дегустац/u,
    cafe: /кофе|кафе/u, coffee: /кофе|coffee/u, arts_centre: /выстав|искус/u,
    park: /парк|прогул|экскурси/u, garden: /сад|garden/u, viewpoint: /экскурси|архитектур/u,
  };
  return tags.some(tag => {
    // live_music is a companion of the rock card, not permission to substitute classical music.
    if (tag === "live_music" && tags.includes("rock")) return false;
    return matchers[tag]?.test(content) ?? false;
  });
}

export function filterChatEvents(events: LiveAstanaEvent[], text: string, context: PilotContext, now = Date.now()) {
  const query = text.toLocaleLowerCase("ru-RU");
  const today = /сегодня|\btoday\b/u.test(query) ? localEventDate(now) : null;
  return events.filter(event => {
    if (event.cityId !== "astana" || event.status !== "scheduled" || event.provenance.scheduleQuality !== "observed") return false;
    const start = Date.parse(event.startsAt);
    if (!Number.isFinite(start) || start < now || (today && localEventDate(start) !== today)) return false;
    const content = eventSearchText(event);
    if (rockQuery.test(query) && !rockQuery.test(content)) return false;
    if (/концерт|concert/u.test(query) && !/концерт|concert|музык/u.test(content)) return false;
    if (/спектак/u.test(query) && !/спектак|театр|балет|опера/u.test(content)) return false;
    if (/лекци|lecture/u.test(query) && !/лекци|lecture|образован/u.test(content)) return false;
    if (!matchesEventPreferences(event, context)) return false;
    if (context.budget === null) return true;
    const amount = event.price.minMinor;
    const knownPrice = amount !== null && event.price.currency === "KZT" && event.provenance.priceQuality === "observed";
    if (!knownPrice) return !context.strictBudget;
    if (amount! > context.budget * 100) return false;
    if (context.strictBudget && (event.price.kind !== "exact" || (context.budgetBasis === "group" && context.partySize > 1 && amount! > 0))) return false;
    return true;
  }).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 3);
}

/** The only network dependency is the fixed-source, hourly cached service passed by the route. */
export async function answerPilotChatWithEvents(text: string, context: PilotContext, options: { getEvents: () => Promise<LiveEventsResult>; now?: () => number }) {
  const base = answerPilotChat(text, context);
  const query = text.toLocaleLowerCase("ru-RU");
  if (cinemaQuery.test(query) || !eventQuery.test(query)) return { ...base, events: [] as LiveAstanaEvent[], eventsMeta: null };
  const now = options.now?.() ?? Date.now();
  let data: LiveEventsResult;
  try { data = await options.getEvents(); }
  catch {
    data = { dataMode: "unavailable", freshness: "unavailable", cacheStatus: "miss", fetchedAt: null, expiresAt: null, source: null, coverage: null, items: [], warnings: ["Не удалось проверить афишу. События не выдумываются."] };
  }
  // Preserve the original explicit preference mode even when parsing the event noun proposes activity.
  const events = filterChatEvents(data.items, text, { ...base.proposedContext, goal: context.goal }, now);
  const firstDate = events.length ? new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(events[0].startsAt)) : null;
  return {
    ...base, items: [], events,
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
