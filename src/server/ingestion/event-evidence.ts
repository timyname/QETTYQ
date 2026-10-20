import type { PilotContext } from "../pilot/contracts";
import type { LiveEventsResult } from "./live-events";
import type { LiveAstanaEvent } from "./sxodim-live";

export type EventEvidence = {
  id: string; eventId: string; name: string; startsAt: string; endsAt: string | null;
  price: LiveAstanaEvent["price"]; sourceUrl: string; organizerUrl: string | null;
  fetchedAt: string; dataMode: LiveEventsResult["dataMode"]; freshness: LiveEventsResult["freshness"];
  requiredCredit: LiveAstanaEvent["requiredCredit"]; unknowns: string[];
};
type Window = { from: number; until: number | null; kind: "upcoming" | "today" | "tomorrow" | "weekend" | "week" | "date" | "available_time"; invalid?: true };
export type EventRetrieval = {
  items: LiveAstanaEvent[]; evidence: EventEvidence[];
  excluded: { eventId: string; reason: string }[];
  constraints: { timeWindow: { from: string; until: string | null; kind: Window["kind"] }; availableMinutes: number; budgetKzt: number | null; strictBudget: boolean; routeChecked: false };
};
const normalize = (text: string) => text.normalize("NFKC").toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
const rock = /(?:^|[^\p{L}])(?:рок|rock|metal|метал|punk|панк)(?:[^\p{L}]|$)/u;
const groups = [
  { query: /культур\p{L}*|\bcultur(?:e|al)\b/gu, content: /культур|театр|спектак|музе|выстав|искус|балет|опера|концерт|музык|лекци|образован|theat|ballet|opera|exhibition|concert|lecture/u },
  { query: /(?:^|[^\p{L}])(?:рок|rock|metal|метал|панк|punk)(?=[^\p{L}]|$)/gu, content: rock },
  { query: /концерт\p{L}*|concert\p{L}*/gu, content: /концерт|concert|музык/u },
  { query: /спектак\p{L}*|театр\p{L}*|theat\p{L}*|қойылым\p{L}*/gu, content: /спектак|театр|theat|қойылым/u },
  { query: /балет\p{L}*|ballet/gu, content: /балет|ballet/u },
  { query: /лекци\p{L}*|lecture\p{L}*|дәріс\p{L}*/gu, content: /лекци|lecture|дәріс|образован/u },
  { query: /выстав\p{L}*|exhibition\p{L}*|көрме\p{L}*/gu, content: /выстав|exhibition|көрме/u },
  { query: /стендап\p{L}*|stand\s*up|комеди\p{L}*/gu, content: /стендап|stand\s*up|комик|комеди/u },
  { query: /квиз\p{L}*|quiz/gu, content: /квиз|quiz/u },
  { query: /мастер[\s-]*класс\p{L}*|workshop\p{L}*/gu, content: /мастер[\s-]*класс|workshop/u },
  { query: /танц\p{L}*|бачат\p{L}*|dance|bachata/gu, content: /танц|бачат|dance|bachata/u },
];
const tagPatterns: Record<string, RegExp> = {
  culture: /культур|театр|спектак|музе|выстав|искус|балет|опера/u,
  museum: /музе|museum/u, theatre: /театр|спектак|theat|қойылым/u, ballet: /балет|ballet/u,
  rock, live_music: /концерт|музык|concert/u, dance: /танц|dance|бачат/u, bachata: /бачат|bachata/u,
  drums: /барабан|drum/u, workshop: /мастер[\s-]*класс|workshop/u,
  sport: /спорт|трениров|турнир|sport/u, armwrestling: /армрестл|армресл/u,
  active: /спорт|трениров|актив/u, sauna: /баня|сауна/u, country: /загород|country/u,
  shashlik: /шашлык/u, food: /еда|гастроном|дегустац/u, restaurant: /ресторан|дегустац/u,
  cafe: /кофе|кафе/u, coffee: /кофе|coffee/u, arts_centre: /выстав|искус/u,
  park: /парк|прогул|экскурси/u, garden: /сад|garden/u, viewpoint: /экскурси|архитектур/u,
};
const stopWords = new Set("найди найти покажи показать посоветуй предложи подбери подобрать хочу хочется можно куда сходить пойти событие события событий мероприятие мероприятия мероприятий афиша афишу интересное интересные интересных подходит подходящие доступные сегодня завтра послезавтра сейчас ближайшие ближайших ближайшее ближайший ближайшую этой этот неделю недели выходные выходных субботу воскресенье октябрь октября ноябрь ноября декабрь декабря январь января февраль февраля март марта апрель апреля май мая июнь июня июль июля август августа сентябрь сентября астана астане астаны astana find show events event today tomorrow weekend week please something available free бесплатно бесплатные бесплатных тенге теңге kzt бюджет бюджета рублей потратить минут минуты минута часов часа час времени время свободно свободных свободные меня нас двоих двое троих человек человека людей группу компания компанию компанией вечером вечер днем днём утро утром без очень такой такие всего больше меньше тыс тысяч стоимость до под для про после через перед рядом около либо или the and for with that this from what where which there these under before after next have want would like".split(/\s+/u));
// Ignore request framing, not arbitrary unmatched interests. Category/date/price
// filters still run independently; e.g. sauna, armwrestling and artist names stay tokens.
const requestScaffolding = new Set("помоги помогите пожалуйста выбрать выбери выбирать выбор выбраться выберусь досуг досуга варианты вариант вариантов предложите подскажите подскажи расскажи расскажите уточнить уточнения организатора организатору организаторов подтвержденной подтвержденные подтвержденных подтвержденного актуальной актуальные актуальных доступной доступных афиши афише интересует интересуют help choose suggest options confirmed listings organizer clarify".split(/\s+/u));
const stem = (word: string) => word.length > 5 ? word.replace(/(?:иями|ами|ями|ого|ему|ому|ыми|ими|ой|ый|ий|ая|яя|ое|ее|ые|ие|ов|ам|ям|ах|ях|ом|ем|ию|ия|ии|а|у|ы|и|я|е|о|ь)$/u, "") : word;

/** A model's semantic query is an additional matcher, never a replacement for
 * the original text's categories, exclusions, dates, price or preferences. */
function textMatcher(query: string) {
  const mentioned = groups.map(group => ({ group, matches: [...query.matchAll(new RegExp(group.query.source, group.query.flags))] })).filter(value => value.matches.length > 0);
  const isNegative = (match: RegExpMatchArray) => /(?:^|[^\p{L}])(?:без\s+|не\s+(?:(?:хочу|нужен|нужны|интересует|нравится)\s+)?)$/u.test(query.slice(0, match.index).trimEnd() + " ");
  const selectedGroups = mentioned.filter(value => value.matches.some(match => !isNegative(match))).map(value => value.group);
  const excludedGroups = mentioned.filter(value => value.matches.every(isNegative)).map(value => value.group);
  let remainder = query.replace(/\b20\d{2}-\d{2}-\d{2}\b/gu, "").replace(/бесплат\p{L}*|тегін|\bfree\b|недел\p{L}*/gu, " ")
    // Only this generic phrase is framing. Names/unsupported activities remain tokens.
    .replace(/куда[\s-]+нибудь/gu, "куда");
  for (const { group } of mentioned) { group.query.lastIndex = 0; remainder = remainder.replace(group.query, " "); }
  const tokens = [...new Set((remainder.match(/\p{L}{4,}/gu) ?? []).filter(token => !stopWords.has(token) && !requestScaffolding.has(token)).map(stem))].slice(0, 12);
  const alternatives = /(?:^|\s)(?:или|либо|or)(?:\s|$)/u.test(query);
  return (content: string): "EXPLICITLY_EXCLUDED_CATEGORY" | "TEXT_MISMATCH" | null => {
    if (excludedGroups.some(group => group.content.test(content))) return "EXPLICITLY_EXCLUDED_CATEGORY";
    const mismatch = alternatives ? selectedGroups.length > 0 && !selectedGroups.some(group => group.content.test(content)) : selectedGroups.some(group => !group.content.test(content));
    return mismatch || tokens.some(token => !content.includes(token)) ? "TEXT_MISMATCH" : null;
  };
}

function localDay(now: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}
function queryWindow(query: string, context: PilotContext, now: number): Window {
  const midnight = Date.parse(`${localDay(now)}T00:00:00+05:00`), day = 86_400_000;
  if (/сейчас|в ближайшие\s+\d|(?:есть|свободн\p{L}*)\s+\d+\s*(?:час|мин)|\b(?:right now|next\s+\d+\s+hours?)\b/u.test(query)) return { from: now, until: now + context.minutes * 60_000, kind: "available_time" };
  if (/сегодня|\btoday\b|бүгін/u.test(query)) return { from: now, until: midnight + day, kind: "today" };
  if (/послезавтра/u.test(query)) return { from: midnight + 2 * day, until: midnight + 3 * day, kind: "date" };
  if (/завтра|\btomorrow\b|ертең/u.test(query)) return { from: midnight + day, until: midnight + 2 * day, kind: "tomorrow" };
  if (/выходн|\bweekend\b|демалыс/u.test(query)) {
    const weekday = new Date(`${localDay(now)}T12:00:00Z`).getUTCDay();
    const untilSaturday = weekday === 0 ? -1 : (6 - weekday + 7) % 7;
    return { from: Math.max(now, midnight + untilSaturday * day), until: midnight + (untilSaturday + 2) * day, kind: "weekend" };
  }
  if (/(?:этой|эту)\s+недел|this week/u.test(query)) {
    const weekday = new Date(`${localDay(now)}T12:00:00Z`).getUTCDay();
    return { from: now, until: midnight + (weekday === 0 ? 1 : 8 - weekday) * day, kind: "week" };
  }
  const iso = query.match(/\b(20\d{2}-\d{2}-\d{2})\b/u)?.[1];
  const ru = query.match(/\b(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s+(20\d{2}))?(?=$|[^\p{L}\d])/u);
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const date = iso ?? (ru ? `${ru[3] ?? localDay(now).slice(0, 4)}-${String(months.indexOf(ru[2]) + 1).padStart(2, "0")}-${ru[1].padStart(2, "0")}` : null);
  if (date) {
    const valid = Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
    return valid ? { from: Math.max(now, Date.parse(`${date}T00:00:00+05:00`)), until: Date.parse(`${date}T00:00:00+05:00`) + day, kind: "date" } : { from: now, until: now, kind: "date", invalid: true };
  }
  return { from: now, until: null, kind: "upcoming" };
}

/** Pure deterministic retrieval. No LLM, network, coordinates, or source description instructions. */
export function retrieveEventEvidence(data: LiveEventsResult, text: string, context: PilotContext, now = Date.now(), options: { semanticText?: string } = {}): EventRetrieval {
  const query = normalize(text), window = queryWindow(query, context, now);
  const budget = /бесплат|тегін|\bfree\b/u.test(query) ? 0 : context.budget;
  const strict = context.strictBudget || budget === 0;
  const matchesOriginal = textMatcher(query);
  const matchesSemantic = options.semanticText?.trim() ? textMatcher(normalize(options.semanticText)) : null;
  const excluded: EventRetrieval["excluded"] = [];
  const reject = (event: LiveAstanaEvent, reason: string) => { excluded.push({ eventId: event.id, reason }); return false; };
  const items = data.items.filter(event => {
    if (data.dataMode === "unavailable" || event.cityId !== "astana" || event.status !== "scheduled" || event.provenance.scheduleQuality !== "observed") return reject(event, "SCHEDULE_UNVERIFIED");
    const start = Date.parse(event.startsAt), end = event.endsAt === null ? null : Date.parse(event.endsAt);
    if (!Number.isFinite(start) || start < window.from || window.until !== null && start >= window.until || window.invalid) return reject(event, "OUTSIDE_DATE_WINDOW");
    if (window.kind === "available_time" && end !== null && Number.isFinite(end) && end > window.until!) return reject(event, "EXCEEDS_AVAILABLE_TIME");
    const content = normalize(`${event.name} ${event.category ?? ""} ${event.venueName ?? ""}`);
    const originalMismatch = matchesOriginal(content);
    if (originalMismatch) return reject(event, originalMismatch);
    if (matchesSemantic?.(content)) return reject(event, "SEMANTIC_TEXT_MISMATCH");
    if (context.goal === "new" && context.likedTags.length && !context.likedTags.some(tag => tag === "live_music" && context.likedTags.includes("rock") ? false : tagPatterns[tag]?.test(content) ?? false)) return reject(event, "PREFERENCE_MISMATCH");
    if (budget !== null) {
      const amount = event.price.minMinor;
      const known = amount !== null && Number.isSafeInteger(amount) && amount >= 0 && event.price.currency === "KZT" && event.provenance.priceQuality === "observed";
      if (!known) return strict ? reject(event, "PRICE_UNKNOWN") : true;
      if (amount! > budget * 100) return reject(event, "OVER_BUDGET");
      if (strict && (event.price.kind !== "exact" || context.budgetBasis === "group" && context.partySize > 1 && amount! > 0)) return reject(event, "FINAL_OR_GROUP_PRICE_UNKNOWN");
    }
    return true;
  }).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 3);
  const evidence = items.map(event => ({
    id: `event-evidence:${event.id}`, eventId: event.id, name: event.name, startsAt: event.startsAt, endsAt: event.endsAt,
    price: event.price, sourceUrl: event.provenance.sourceUrl, organizerUrl: event.organizerUrl ?? null,
    fetchedAt: event.fetchedAt, dataMode: data.dataMode, freshness: data.freshness, requiredCredit: event.requiredCredit,
    unknowns: [...event.warnings, ...(event.price.basis === "unknown" ? ["PRICE_BASIS_UNKNOWN"] : []), "ROUTE_NOT_CHECKED", ...(event.endsAt === null ? ["TIME_FIT_UNCERTAIN"] : []), ...(event.price.kind === "from" ? ["FINAL_PRICE_UNKNOWN"] : [])],
  }));
  return { items, evidence, excluded, constraints: { timeWindow: { from: new Date(window.from).toISOString(), until: window.until === null ? null : new Date(window.until).toISOString(), kind: window.kind }, availableMinutes: context.minutes, budgetKzt: budget, strictBudget: strict, routeChecked: false } };
}
