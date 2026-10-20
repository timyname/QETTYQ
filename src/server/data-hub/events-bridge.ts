import type { LiveAstanaEvent } from "../ingestion/sxodim-live";
import type { LiveEventsResult } from "../ingestion/live-events";
import type { HubPublicEvent, HubPublicFeed } from "./public-feed";

/** Conservative legacy DTO conversion: ranges become unknown, never "from" or
 * free. Source attribution/parser/coordinate quality remain truthful. No fetch. */
export function hubEventToLiveEvent(event: HubPublicEvent, now: number): LiveAstanaEvent | null {
  if (event.cityId !== "astana" || Date.parse(event.startsAt) < now || Date.parse(event.expiresAt) <= now) return null;
  const point = event.venue?.coordinates;
  const knownPrice = event.priceState === "observed" && ["exact", "from"].includes(event.price.priceKind)
    && event.price.minMinor !== null && event.price.currency === "KZT";
  const price: LiveAstanaEvent["price"] = knownPrice ? { kind: event.price.priceKind as "exact" | "from", minMinor: event.price.minMinor,
    currency: "KZT", basis: event.price.basis } : { kind: "unknown", minMinor: null, currency: null, basis: "unknown" };
  const duration = event.endsAt ? Math.ceil((Date.parse(event.endsAt) - Date.parse(event.startsAt)) / 60_000) : null;
  return { id: event.id, name: event.name, cityId: "astana", category: event.category,
    venueName: event.venue?.name ?? null, address: event.venue?.address ?? null, lat: point?.lat ?? null, lon: point?.lon ?? null,
    coordinateQuality: point?.quality ?? "unknown",
    ...(point ? { coordinateProvenance: { sourceUrl: point.sourceUrl, fetchedAt: event.venue!.fetchedAt, quality: point.quality, methodId: point.methodId } } : {}),
    startsAt: event.startsAt, endsAt: event.endsAt, timeZone: "Asia/Almaty",
    durationMinutes: duration !== null && duration > 0 && duration <= 1440 ? duration : null,
    contentLanguage: event.languages.length === 1 ? event.languages[0] : "und", contentLanguages: [...event.languages],
    priceFromKzt: price.minMinor === null ? null : price.minMinor / 100, price, priceEvidence: knownPrice ? event.priceEvidence : null,
    status: "scheduled", availability: "unknown", bookingUrl: event.bookingUrl, contactUrl: event.organizerUrl ?? event.sourceUrl,
    organizerUrl: event.organizerUrl, image: null, requiredCredit: { text: event.requiredCredit ?? "Источник события", url: event.sourceUrl },
    fetchedAt: event.fetchedAt, expiresAt: event.expiresAt, dataMode: "snapshot", freshness: "fresh",
    provenance: { sourceId: event.sourceId, sourceUrl: event.sourceUrl, parserVersion: "qettyq-data-hub-v1", scheduleQuality: "observed",
      priceQuality: knownPrice ? "observed" : event.priceState === "conflicting" ? "conflicting" : "unknown" },
    warnings: ["DATA_HUB_APPROVED_SOURCE_FACTS", "AVAILABILITY_NOT_LIVE_INVENTORY", ...(price.kind === "unknown" ? ["PRICE_UNKNOWN"] : []),
      ...(event.price.priceKind === "range" ? ["RANGE_PRICE_NOT_SUPPORTED_IN_LEGACY_CARD"] : []),
      ...(point?.quality === "derived" ? ["COORDINATES_DERIVED"] : []), ...(event.endsAt ? ["DURATION_DERIVED_FROM_OBSERVED_INTERVAL"] : ["DURATION_UNKNOWN"])],
  };
}

export function createHubEventsBridge(options: { baseGet(): Promise<LiveEventsResult>; hubGet(): Promise<HubPublicFeed>; now?: () => number }) {
  return { async get(): Promise<LiveEventsResult> {
    const now = options.now?.() ?? Date.now();
    let base: LiveEventsResult;
    try { base = await options.baseGet(); }
    catch { base = { items: [], dataMode: "unavailable", freshness: "unavailable", cacheStatus: "miss", fetchedAt: null, expiresAt: null, source: null, coverage: null, warnings: ["Основная афиша недоступна."] }; }
    let hub: HubPublicFeed;
    try { hub = await options.hubGet(); } catch { return base; }
    const added = hub.events.flatMap(event => { const item = hubEventToLiveEvent(event, now); return item ? [item] : []; });
    if (!added.length) return base;
    const baseItems = base.items.map(event => ({ ...event, dataMode: event.dataMode ?? (base.dataMode === "live" ? "live" as const : "snapshot" as const),
      freshness: event.freshness ?? (base.freshness === "fresh" ? "fresh" as const : "stale" as const) }));
    const items = [...new Map([...baseItems, ...added].map(event => [event.id, event])).values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const fetched = items.map(item => item.fetchedAt).filter(value => Number.isFinite(Date.parse(value))).sort();
    const expiries = [...(base.items.length && base.expiresAt ? [base.expiresAt] : []), ...added.flatMap(item => item.expiresAt ? [item.expiresAt] : [])].sort();
    return { ...base, items, dataMode: "snapshot", freshness: base.items.length && base.freshness !== "fresh" ? "stale" : "fresh",
      fetchedAt: fetched[0] ?? null, expiresAt: expiries[0] ?? null, source: null, coverage: null,
      warnings: [...base.warnings, "Смешанная афиша: сохранённые данные разрешённых источников. У каждой карточки собственные источник и время проверки; общего показателя покрытия нет."] };
  } };
}
