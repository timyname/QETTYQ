import { describe, expect, it } from "vitest";
import { retrieveEventEvidence } from "../../src/server/ingestion/event-evidence";
import { pilotContextSchema } from "../../src/server/pilot/contracts";
import { parseContext } from "../../src/server/pilot/chat";
import type { LiveAstanaEvent } from "../../src/server/ingestion/sxodim-live";
import type { LiveEventsResult } from "../../src/server/ingestion/live-events";

// Explicitly synthetic; never used by production import or seeded into public data.
const now = Date.parse("2026-10-20T12:00:00Z");
const context = pilotContextSchema.parse({});
function item(id: string, patch: Partial<LiveAstanaEvent> = {}): LiveAstanaEvent {
  const url = `https://sxodim.com/astana/event/synthetic-${id}`;
  return { id, name: "SYNTHETIC TEST · рок концерт Ленинград", cityId: "astana", category: "Концерты", venueName: null, address: null, lat: null, lon: null, startsAt: "2026-10-20T15:00:00Z", endsAt: null, timeZone: "Asia/Almaty", durationMinutes: null, contentLanguage: "und", priceFromKzt: null, price: { kind: "unknown", minMinor: null, currency: null, basis: "unknown" }, status: "scheduled", availability: "unknown", bookingUrl: null, contactUrl: url, organizerUrl: null, image: null, requiredCredit: { text: "Давай Сходим", url }, fetchedAt: "2026-10-20T11:50:00Z", provenance: { sourceId: "sxodim-astana-noncommercial", sourceUrl: url, parserVersion: "sxodim-jsonld-v1", scheduleQuality: "observed", priceQuality: "unknown" }, warnings: ["DURATION_UNKNOWN"], ...patch };
}
const data = (items: LiveAstanaEvent[], patch: Partial<LiveEventsResult> = {}): LiveEventsResult => ({ items, dataMode: "live", freshness: "fresh", cacheStatus: "hit", fetchedAt: "2026-10-20T11:50:00Z", expiresAt: "2026-10-20T12:50:00Z", source: null, coverage: null, warnings: [], ...patch });
const find = (items: LiveAstanaEvent[], text: string, ctx = context) => retrieveEventEvidence(data(items), text, ctx, now);

describe("bounded deterministic event retrieval and evidence", () => {
  it("accepts a plain events request without requiring its scaffolding in titles", () => {
    expect(find([item("rock"), item("theatre", { name: "SYNTHETIC TEST · спектакль", category: "Театр" })], "События").items).toHaveLength(2);
  });
  it("normalizes polite cultural requests to an observed category without weakening specific interests", () => {
    const polite = "Помоги выбрать культурный досуг в Астане. Предложи варианты из подтверждённой афиши и подскажи, что уточнить у организатора.";
    const theatre = item("theatre", { name: "SYNTHETIC TEST · спектакль", category: "Театр" });
    const exhibition = item("exhibition", { name: "SYNTHETIC TEST · выставка", category: "Выставки" });
    const sport = item("sport", { name: "SYNTHETIC TEST · вечерняя пробежка", category: "Спорт" });
    const fixtures = [theatre, exhibition, sport];
    expect(find(fixtures, polite).items.map(event => event.id)).toEqual(["theatre", "exhibition"]);
    for (const interest of ["сауна", "армрестлинг", "НесуществующаяГруппа"]) {
      expect(find(fixtures, `${polite} ${interest}`).items).toEqual([]);
    }
    expect(find([theatre, item("rock")], `${polite} Рок концерт`).items.map(event => event.id)).toEqual(["rock"]);
    expect(find(fixtures, polite, { ...context, goal: "new", likedTags: ["rock", "live_music"] }).items).toEqual([]);
    expect(find(fixtures, polite, { ...context, budget: 3000, strictBudget: true }).items).toEqual([]);
    expect(find([theatre, { ...exhibition, startsAt: "2026-10-21T15:00:00Z" }], `${polite} Сегодня`).items.map(event => event.id)).toEqual(["theatre"]);
  });
  it("finds title words instead of returning every event of the same category", () => {
    const a = item("requested"), b = item("different", { name: "SYNTHETIC TEST · рок концерт другая группа" });
    expect(find([a, b], "Найди концерт Ленинград").items.map(x => x.id)).toEqual([a.id]);
    expect(find([b], "Концерт Ленинград").excluded[0].reason).toBe("TEXT_MISMATCH");
  });
  it("does not infer rock from any concert or a word containing рок", () => {
    const classical = item("classical", { name: "SYNTHETIC TEST · симфонический концерт" });
    expect(find([classical], "Рок концерт").items).toEqual([]);
    expect(find([item("drum", { name: "SYNTHETIC TEST · урок барабанов", category: "Мастер-классы" })], "Урок барабанов").items).toHaveLength(1);
  });
  it("honors explicit or rather than requiring mutually exclusive event categories", () => {
    const standup = item("standup", { name: "SYNTHETIC TEST · стендап", category: "Stand up" });
    expect(find([standup, item("rock")], "Концерт или стендап").items).toHaveLength(2);
  });
  it("never turns a negated category into a desired one", () => {
    const ballet = item("ballet", { name: "SYNTHETIC TEST · балет", category: "Балет" });
    expect(find([ballet, item("rock")], "Не хочу балет, покажи рок концерт").items.map(x => x.id)).toEqual(["rock"]);
    expect(find([ballet], "Не балет").items).toEqual([]);
  });
  it("treats без балета as an exclusion, not a request to recommend ballet", () => {
    const ballet = item("ballet", { name: "SYNTHETIC TEST · балет", category: "Балет" });
    expect(find([ballet, item("rock")], "События без балета").items.map(x => x.id)).toEqual(["rock"]);
    expect(find([ballet], "Безбалета").items).toEqual([]);
  });
  it("uses the Astana local calendar for today and tomorrow", () => {
    const today = item("today", { startsAt: "2026-10-20T18:30:00Z" });
    const tomorrow = item("tomorrow", { startsAt: "2026-10-20T19:30:00Z" });
    expect(find([today, tomorrow], "События сегодня").items.map(x => x.id)).toEqual([today.id]);
    expect(find([today, tomorrow], "События завтра").items.map(x => x.id)).toEqual([tomorrow.id]);
  });
  it("bounds weekends and explicit dates, without moving events to fit a request", () => {
    const friday = item("friday", { startsAt: "2026-10-23T15:00:00Z" }), saturday = item("saturday", { startsAt: "2026-10-24T15:00:00Z" });
    expect(find([friday, saturday], "Афиша на выходных").items.map(x => x.id)).toEqual([saturday.id]);
    expect(find([friday, saturday], "События 23 октября").items.map(x => x.id)).toEqual([friday.id]);
    expect(find([friday, saturday], "События 2026-10-24").items.map(x => x.id)).toEqual([saturday.id]);
    expect(find([friday, saturday], "События 2026-02-30").items).toEqual([]);
  });
  it("bounds this week at next local Monday", () => {
    const sunday = item("sun", { startsAt: "2026-10-25T15:00:00Z" }), monday = item("mon", { startsAt: "2026-10-26T15:00:00Z" });
    expect(find([sunday, monday], "События на этой неделе").items.map(x => x.id)).toEqual([sunday.id]);
  });
  it("checks known visit end for immediate availability, flags unknown duration/route", () => {
    const soon = item("soon", { startsAt: "2026-10-20T12:30:00Z" }), long = item("long", { startsAt: "2026-10-20T12:30:00Z", endsAt: "2026-10-20T15:00:00Z" });
    const result = find([soon, long], "События сейчас", { ...context, minutes: 120 });
    expect(result.items.map(x => x.id)).toEqual([soon.id]);
    expect(result.evidence[0].unknowns).toContain("TIME_FIT_UNCERTAIN");
    expect(result.evidence[0].unknowns).toContain("ROUTE_NOT_CHECKED");
    expect(result.constraints.routeChecked).toBe(false);
  });
  it("does not convert unknown/from into free and rejects confirmed over-budget events", () => {
    const free = item("free", { price: { kind: "exact", minMinor: 0, currency: "KZT", basis: "unknown" }, provenance: { ...item("free").provenance, priceQuality: "observed" } });
    const from = item("from", { price: { kind: "from", minMinor: 0, currency: "KZT", basis: "unknown" }, provenance: { ...item("from").provenance, priceQuality: "observed" } });
    expect(find([item("unknown"), free, from], "Бесплатные события").items.map(x => x.id)).toEqual([free.id]);
    const costly = item("costly", { price: { kind: "exact", minMinor: 600000, currency: "KZT", basis: "unknown" }, provenance: { ...item("costly").provenance, priceQuality: "observed" } });
    expect(find([costly], "Афиша", { ...context, budget: 3000 }).items).toEqual([]);
    expect(find([free], "Бесплатные события").constraints).toMatchObject({ budgetKzt: 0, strictBudget: true });
    expect(parseContext("Найди события до 3 000 ₸", context)).toMatchObject({ budget: 3000, strictBudget: true });
  });
  it("keeps uncertain price basis explicit and does not multiply an unknown group basis", () => {
    const paid = item("paid", { price: { kind: "exact", minMinor: 100000, currency: "KZT", basis: "unknown" }, provenance: { ...item("paid").provenance, priceQuality: "observed" } });
    expect(find([paid], "Афиша").evidence[0].unknowns).toContain("PRICE_BASIS_UNKNOWN");
    expect(find([paid], "Афиша", { ...context, budget: 3000, budgetBasis: "group", partySize: 2, strictBudget: true }).items).toEqual([]);
  });
  it("preserves freshness and trusted citations per card, omitting GPS and source instructions", () => {
    const source = item("fact", { organizerUrl: "https://organizer.example/event" });
    const result = retrieveEventEvidence(data([source], { dataMode: "snapshot", freshness: "stale" }), "Афиша", context, now);
    expect(result.evidence[0]).toMatchObject({ eventId: source.id, sourceUrl: source.provenance.sourceUrl, organizerUrl: source.organizerUrl, fetchedAt: source.fetchedAt, dataMode: "snapshot", freshness: "stale" });
    expect(result.evidence[0]).not.toHaveProperty("lat");
    expect(result.evidence[0]).not.toHaveProperty("address");
    expect(JSON.stringify(result.evidence)).not.toContain("description");
  });
  it("returns no fabricated records for unavailable source and retains explicit rock preferences", () => {
    expect(retrieveEventEvidence(data([item("test")], { dataMode: "unavailable", freshness: "unavailable" }), "Афиша", context, now).items).toEqual([]);
    expect(find([item("classical", { name: "SYNTHETIC TEST · симфонический концерт" })], "Концерты", { ...context, goal: "new", likedTags: ["rock", "live_music"] }).items).toEqual([]);
  });
});
