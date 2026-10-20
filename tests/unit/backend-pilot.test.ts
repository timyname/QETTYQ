import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as catalog } from "../../src/app/api/catalog/route";
import { POST as openSession, GET as readSession } from "../../src/app/api/session/route";
import { POST as saveContext } from "../../src/app/api/context/route";
import { POST as chat } from "../../src/app/api/chat/route";
import { POST as savePlan, GET as readPlans } from "../../src/app/api/plans/route";
import { DELETE as deleteData } from "../../src/app/api/session/data/route";
import { resetSessionStoreForTests } from "../../src/server/session/store";
import { pilotContextSchema } from "../../src/server/pilot/contracts";
import { answerPilotChat, answerPilotChatWithEvents, filterChatEvents } from "../../src/server/pilot/chat";
import { liveEventsService, type LiveEventsResult } from "../../src/server/ingestion/live-events";
import type { LiveAstanaEvent } from "../../src/server/ingestion/sxodim-live";
import { calculatePlan } from "../../src/server/pilot/plans";
import { pilotPlaces } from "../../src/server/pilot/catalog";
import { recommend } from "../../src/domain/recommend";

const base = "http://localhost:3000";
const context = pilotContextSchema.parse({ goal: "activity", minutes: 120, budget: null });
function request(path: string, cookie = "", body?: unknown, method = body === undefined ? "GET" : "POST") {
  return new Request(`${base}${path}`, { method, headers: { cookie, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function session() {
  const response = await openSession(request("/api/session", "", {}));
  return response.headers.get("set-cookie")!.split(";", 1)[0];
}

describe("Astana backend pilot (snapshot, no external providers)", () => {
  beforeEach(() => { resetSessionStoreForTests(); vi.restoreAllMocks(); });

  it("returns public catalog without raw provenance and preserves mandatory attribution", async () => {
    const response = await catalog(request("/api/catalog"));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.dataMode).toBe("snapshot");
    expect(result.attribution.text).toContain("OpenStreetMap");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).not.toHaveProperty("sourceUrl");
    expect(result.items[0]).not.toHaveProperty("retrievedAt");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await catalog(request("/api/catalog?cityId=almaty"))).status).toBe(400);
  });

  it("does not invent start location or ETA when chatting without location", async () => {
    const cookie = await session();
    const response = await chat(request("/api/chat", cookie, { text: "Хочу в театр", context }));
    const result = await response.json();
    expect(result.generationMode).toBe("deterministic");
    expect(result.proposedContext.origin).toBeNull();
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item: { travelMinutes: unknown }) => item.travelMinutes === null)).toBe(true);
    expect(result.steps.every((step: { status: string }) => step.status === "completed")).toBe(true);
  });

  it("proposes parsed constraints without silently saving them", async () => {
    const cookie = await session();
    await saveContext(request("/api/context", cookie, context));
    const result = await (await chat(request("/api/chat", cookie, { text: "Кофе на 90 минут до 3 000 ₸" }))).json();
    expect(result.proposedContext).toMatchObject({ goal: "food", minutes: 90, budget: 3000 });
    expect((await (await readSession(request("/api/session", cookie))).json()).context).toMatchObject({ goal: "activity", minutes: 120, budget: null });
  });

  it("does not fabricate films, events or tickets", () => {
    const result = answerPilotChat("Какие фильмы идут сегодня в кино?", context);
    expect(result.items).toEqual([]);
    expect(result.reply).toContain("нет подтверждённых");
    expect(result.generationMode).toBe("deterministic");
  });

  it("never replaces unsupported rock-only interests with ballet or theatre", () => {
    const rockOnly = { ...context, goal: "new" as const, likedTags: ["rock", "live_music"] };
    expect(answerPilotChat("Подбери места по моим условиям", rockOnly).items).toEqual([]);
    expect(answerPilotChat("Подбери места по моим условиям", { ...rockOnly, origin: { lat: 51.1282, lon: 71.4304 } }).items).toEqual([]);
  });

  it("rejects invalid locations, foreign fields and cross-site mutations", async () => {
    const cookie = await session();
    expect((await saveContext(request("/api/context", cookie, { ...context, origin: { lat: 43.2, lon: 76.8 } }))).status).toBe(400);
    expect((await chat(request("/api/chat", cookie, { text: "test", fetchUrl: "http://localhost/" }))).status).toBe(400);
    expect((await chat(new Request(`${base}/api/chat`, { method: "POST", headers: { cookie, origin: "https://other.invalid" }, body: JSON.stringify({ text: "test" }) }))).status).toBe(403);
    expect((await chat(request("/api/chat", "", { text: "test" }))).status).toBe(401);
  });

  it("accepts the actual HTTP Host when Next normalizes request URL, never forwarded hosts", async () => {
    const make = (origin: string, host = "127.0.0.1:3000", fetchSite = "same-origin") => new Request("http://localhost:3000/api/session", {
      method: "POST", headers: { origin, host, "sec-fetch-site": fetchSite, "x-forwarded-host": "evil.invalid" },
    });
    expect((await openSession(make("http://127.0.0.1:3000"))).status).toBe(201);
    expect((await openSession(make("http://evil.invalid"))).status).toBe(403);
    expect((await openSession(make("http://127.0.0.1:3000", "127.0.0.1:3000", "cross-site"))).status).toBe(403);
    expect((await openSession(make("http://evil.invalid", "127.0.0.1:3000@evil.invalid"))).status).toBe(403);
  });

  it("leaves unknown costs unknown and refuses free-only claims", () => {
    const result = answerPilotChat("Бесплатный музей", { ...context, strictBudget: true });
    expect(result.proposedContext.budget).toBe(0);
    expect(result.items.every((item) => item.price !== null && item.price.max === 0)).toBe(true);
  });

  it("never calls a straight-line estimate feasible or adds an unrequested return", () => {
    const place = { ...pilotPlaces.find((item) => item.category === "theatre")!, price: { min: 1000, max: 2000 } };
    const origin = { lat: place.lat + 0.001, lon: place.lon };
    const [oneWay] = recommend([place], { goal: "activity", minutes: 200, budget: 3000, origin, likedTags: [] });
    const [returning] = recommend([place], { goal: "activity", minutes: 200, budget: 3000, origin, likedTags: [], returnToOrigin: true });
    expect(oneWay.feasibility).toBe("uncertain");
    expect(returning.totalMinutes - oneWay.totalMinutes).toBe(oneWay.travelMinutes);
  });

  it("checks price bounds on a group budget and excludes unrelated categories", () => {
    const place = { ...pilotPlaces.find((item) => item.category === "theatre")!, price: { min: 1000, max: 2000 } };
    const common = { goal: "activity" as const, minutes: 200, budget: 3000, origin: place, likedTags: [], partySize: 3, budgetBasis: "group" as const };
    expect(recommend([place], common)[0].unknowns).toContain("Верхняя граница цены превышает выбранный бюджет");
    expect(recommend([place], { ...common, strictBudget: true })).toEqual([]);
    expect(recommend([place], { ...common, budget: 2000 })).toEqual([]);
    expect(recommend([place], { ...common, goal: "food", budget: null })).toEqual([]);
  });

  it("calculates ordered stops without drawing a false road route", () => {
    const places = pilotPlaces.slice(0, 2);
    const plan = calculatePlan(places, { ...context, origin: places[0], minutes: 720 });
    expect(plan.placeIds).toEqual(places.map((place) => place.id));
    expect(plan.legs).toHaveLength(2);
    expect(plan.budget.min).toBeNull();
    expect(plan.totalMinutes).toBe(plan.visitMinutes + plan.travelMinutes! + plan.bufferMinutes);
    expect(plan.feasibility).toBe("uncertain");
    expect(plan).not.toHaveProperty("geometry");
  });

  it("saves an idempotent isolated plan and deletes it with context", async () => {
    const cookie = await session();
    const otherCookie = await session();
    const body = { placeIds: [pilotPlaces[0].id], context };
    const first = await savePlan(request("/api/plans", cookie, body));
    const firstBody = await first.json();
    const retry = await (await savePlan(request("/api/plans", cookie, body))).json();
    expect(first.status).toBe(201);
    expect(retry.plan.id).toBe(firstBody.plan.id);
    expect(retry.replayed).toBe(true);
    expect(retry.plan).not.toHaveProperty("fingerprint");
    expect((await (await readPlans(request("/api/plans", otherCookie))).json()).items).toEqual([]);
    await saveContext(request("/api/context", cookie, context));
    const deleted = await (await deleteData(request("/api/session/data", cookie, {}, "DELETE"))).json();
    expect(deleted.removed.plans).toBe(1);
    const remaining = await (await readSession(request("/api/session", cookie))).json();
    expect(remaining.context).toBeNull();
    expect(remaining.plans).toEqual([]);
  });

  it("rejects fabricated place IDs and duplicate route stops", async () => {
    const cookie = await session();
    expect((await savePlan(request("/api/plans", cookie, { placeIds: ["invented:place"], context }))).status).toBe(400);
    expect((await savePlan(request("/api/plans", cookie, { placeIds: [pilotPlaces[0].id, pilotPlaces[0].id], context }))).status).toBe(400);
  });
});

const eventClock = Date.parse("2026-10-20T20:00:00Z"); // 21 October, 01:00 in Astana.
function syntheticEvent(id: string, patch: Partial<LiveAstanaEvent> = {}): LiveAstanaEvent {
  return {
    id: `synthetic_test:${id}`, name: "SYNTHETIC TEST · рок-концерт", cityId: "astana", category: "Концерты",
    venueName: "SYNTHETIC TEST venue", address: null, lat: null, lon: null,
    startsAt: "2026-10-20T21:00:00.000Z", endsAt: null, timeZone: "Asia/Almaty", durationMinutes: null, contentLanguage: "und",
    priceFromKzt: null, price: { kind: "unknown", minMinor: null, currency: null, basis: "unknown" },
    status: "scheduled", availability: "unknown", bookingUrl: null, contactUrl: "https://organizer.example/synthetic-test", image: null,
    requiredCredit: { text: "Давай Сходим", url: "https://organizer.example/synthetic-test" }, fetchedAt: "2026-10-20T19:00:00.000Z",
    provenance: { sourceId: "sxodim-astana-noncommercial", sourceUrl: "https://organizer.example/synthetic-test", parserVersion: "sxodim-jsonld-v1", scheduleQuality: "observed", priceQuality: "unknown" },
    warnings: ["SYNTHETIC_TEST_ONLY"], ...patch,
  };
}
function eventResult(items: LiveAstanaEvent[]): LiveEventsResult {
  return {
    dataMode: "snapshot", freshness: "stale", cacheStatus: "stale-fallback", fetchedAt: "2026-10-20T19:00:00.000Z", expiresAt: "2026-10-20T20:00:00.000Z",
    source: null, coverage: null, items, warnings: ["SYNTHETIC TEST · сохранённый снимок"],
  };
}

describe("chat event retrieval (injected cache only; no network)", () => {
  beforeEach(() => { resetSessionStoreForTests(); vi.restoreAllMocks(); });

  it("returns event cards separately from POIs through the real chat route", async () => {
    const event = syntheticEvent("lecture", { name: "SYNTHETIC TEST · лекция об архитектуре", category: "Образование", startsAt: "2099-10-21T12:00:00.000Z" });
    const source = vi.spyOn(liveEventsService, "get").mockResolvedValue(eventResult([event]));
    const cookie = await session();
    const response = await chat(request("/api/chat", cookie, { text: "Найди лекции", context }));
    const result = await response.json();
    expect(source).toHaveBeenCalledTimes(1);
    expect(result.items).toEqual([]);
    expect(result.events.map((value: LiveAstanaEvent) => value.id)).toEqual([event.id]);
    expect(result.eventsMeta).toMatchObject({ dataMode: "snapshot", freshness: "stale", cacheStatus: "stale-fallback" });
    expect(result.generationMode).toBe("deterministic");
    expect(result.reply).toContain("время Астаны");
    expect(result.events[0].durationMinutes).toBeNull();
    expect(result.events[0].availability).toBe("unknown");
  });

  it("filters today in Asia/Almaty, not the UTC calendar day", () => {
    const today = syntheticEvent("today");
    const tomorrow = syntheticEvent("tomorrow", { startsAt: "2026-10-21T21:00:00.000Z" });
    const expired = syntheticEvent("expired", { startsAt: "2026-10-20T19:00:00.000Z" });
    expect(filterChatEvents([today, tomorrow, expired], "События сегодня", context, eventClock).map(event => event.id)).toEqual([today.id]);
  });

  it("never treats unknown or from prices as free under a strict zero budget", () => {
    const observed = { ...syntheticEvent("base").provenance, priceQuality: "observed" as const };
    const unknown = syntheticEvent("unknown");
    const from = syntheticEvent("from", { price: { kind: "from", minMinor: 0, currency: "KZT", basis: "unknown" }, provenance: observed });
    const free = syntheticEvent("free", { price: { kind: "exact", minMinor: 0, currency: "KZT", basis: "unknown" }, provenance: observed });
    const paid = syntheticEvent("paid", { price: { kind: "exact", minMinor: 200_000, currency: "KZT", basis: "unknown" }, provenance: observed });
    const items = [unknown, from, free, paid];
    expect(filterChatEvents(items, "Афиша", { ...context, budget: 0, strictBudget: true }, eventClock).map(event => event.id)).toEqual([free.id]);
    expect(filterChatEvents(items, "Афиша", { ...context, budget: 3000, strictBudget: true }, eventClock).map(event => event.id)).toEqual([free.id, paid.id]);
    expect(unknown.price.minMinor).toBeNull();
  });

  it("keeps rock-only preferences instead of substituting ballet or classical music", async () => {
    const rock = syntheticEvent("rock");
    const classical = syntheticEvent("classical", { name: "SYNTHETIC TEST · симфонический концерт" });
    const ballet = syntheticEvent("ballet", { name: "SYNTHETIC TEST · спектакль и балет", category: "Театр" });
    const result = await answerPilotChatWithEvents("Покажи концерты", { ...context, goal: "new", likedTags: ["rock", "live_music"] }, { getEvents: async () => eventResult([classical, ballet, rock]), now: () => eventClock });
    expect(result.items).toEqual([]);
    expect(result.events.map(event => event.id)).toEqual([rock.id]);
  });

  it("does not contact the event service for cinema sessions or ordinary POI search", async () => {
    const getEvents = vi.fn(async () => eventResult([]));
    const cinema = await answerPilotChatWithEvents("Фильмы сегодня в кино", context, { getEvents, now: () => eventClock });
    const places = await answerPilotChatWithEvents("Кофе на 90 минут", context, { getEvents, now: () => eventClock });
    expect(getEvents).not.toHaveBeenCalled();
    expect(cinema.events).toEqual([]);
    expect(cinema.items).toEqual([]);
    expect(cinema.reply).toContain("нет подтверждённых");
    expect(places.eventsMeta).toBeNull();
  });

  it("handles provider failure without inventing events or replacing them with POIs", async () => {
    const result = await answerPilotChatWithEvents("Афиша событий", context, { getEvents: async () => { throw new Error("SYNTHETIC_PROVIDER_FAILURE"); }, now: () => eventClock });
    expect(result.events).toEqual([]);
    expect(result.items).toEqual([]);
    expect(result.eventsMeta?.dataMode).toBe("unavailable");
    expect(result.reply).toContain("Афиша сейчас недоступна");
  });
});
