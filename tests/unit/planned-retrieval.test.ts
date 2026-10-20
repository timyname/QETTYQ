import { describe, expect, it, vi } from "vitest";
import { answerPilotChatWithEvents } from "../../src/server/pilot/chat";
import { pilotContextSchema } from "../../src/server/pilot/contracts";
import { retrieveEventEvidence } from "../../src/server/ingestion/event-evidence";
import type { LiveEventsResult } from "../../src/server/ingestion/live-events";
import type { LiveAstanaEvent } from "../../src/server/ingestion/sxodim-live";

// Offline synthetic fixtures only. Not a catalogue, live fetch or model request.
const now = Date.parse("2026-10-20T12:00:00Z");
const context = pilotContextSchema.parse({});
function event(id: string, patch: Partial<LiveAstanaEvent> = {}): LiveAstanaEvent {
  const sourceUrl = `https://sxodim.com/astana/event/synthetic-planned-${id}`;
  return { id, name: "SYNTHETIC TEST · лекция", category: "Образование", cityId: "astana", venueName: null,
    address: null, lat: null, lon: null, startsAt: "2026-10-20T15:00:00Z", endsAt: null,
    timeZone: "Asia/Almaty", durationMinutes: null, contentLanguage: "und", priceFromKzt: null,
    price: { kind: "unknown", minMinor: null, currency: null, basis: "unknown" }, status: "scheduled", availability: "unknown",
    bookingUrl: null, contactUrl: sourceUrl, organizerUrl: null, image: null, requiredCredit: { text: "Давай Сходим", url: sourceUrl },
    fetchedAt: "2026-10-20T11:50:00Z", provenance: { sourceId: "sxodim-astana-noncommercial", sourceUrl,
      parserVersion: "sxodim-jsonld-v1", scheduleQuality: "observed", priceQuality: "unknown" }, warnings: [], ...patch };
}
function data(items: LiveAstanaEvent[]): LiveEventsResult {
  return { items, dataMode: "live", freshness: "fresh", cacheStatus: "hit", fetchedAt: "2026-10-20T11:50:00Z",
    expiresAt: "2026-10-20T12:50:00Z", source: null, coverage: null, warnings: [] };
}
const theatre = event("theatre", { name: "SYNTHETIC TEST · спектакль", category: "Театр" });
const rock = event("rock", { name: "SYNTHETIC TEST · рок концерт", category: "Концерты" });

describe("planned event retrieval preserves original deterministic constraints", () => {
  it("forceEvents makes one source lookup for generic framing, with semantic narrowing", async () => {
    const getEvents = vi.fn().mockResolvedValue(data([theatre, rock]));
    const original = "Хочу куда-нибудь выбраться";
    const normal = await answerPilotChatWithEvents(original, context, { getEvents, now: () => now });
    expect(normal.events).toEqual([]); expect(getEvents).not.toHaveBeenCalled();
    const planned = await answerPilotChatWithEvents(original, context, { getEvents, now: () => now, forceEvents: true, semanticText: "Рок концерты в Астане" });
    expect(getEvents).toHaveBeenCalledOnce(); expect(planned.events.map(item => item.id)).toEqual(["rock"]);
    expect(planned.eventEvidence.map(item => item.eventId)).toEqual(["rock"]);
  });

  it("matches semantic query before top-three truncation", () => {
    const firstThree = [0, 1, 2].map(index => event(`lecture-${index}`));
    const result = retrieveEventEvidence(data([...firstThree, theatre]), "Хочу куда-нибудь выбраться", context, now, { semanticText: "Спектакли в Астане" });
    expect(result.items.map(item => item.id)).toEqual(["theatre"]);
    expect(result.excluded).toHaveLength(3);
  });

  it("never replaces original rock interest with a broad or contrary planner category", () => {
    const facts = data([theatre, rock]);
    expect(retrieveEventEvidence(facts, "Рок концерты", context, now, { semanticText: "События" }).items.map(item => item.id)).toEqual(["rock"]);
    expect(retrieveEventEvidence(facts, "Рок концерты", context, now, { semanticText: "Спектакли" }).items).toEqual([]);
    expect(retrieveEventEvidence(facts, "Хочу куда-нибудь выбраться", { ...context, goal: "new", likedTags: ["rock", "live_music"] }, now, { semanticText: "События" }).items.map(item => item.id)).toEqual(["rock"]);
  });

  it("keeps original exclusions even when planner suggests the excluded category", () => {
    const ballet = event("ballet", { name: "SYNTHETIC TEST · балет", category: "Балет" });
    const result = retrieveEventEvidence(data([ballet, rock]), "События без балета", context, now, { semanticText: "Балет" });
    expect(result.items).toEqual([]);
    expect(result.excluded).toContainEqual({ eventId: "ballet", reason: "EXPLICITLY_EXCLUDED_CATEGORY" });
  });

  it.each(["сауна", "армрестлинг", "НесуществующаяГруппа"])("does not discard unknown named interest %s as generic framing", async interest => {
    const result = await answerPilotChatWithEvents(`Хочу куда-нибудь выбраться ${interest}`, context, {
      getEvents: async () => data([theatre, rock]), now: () => now, forceEvents: true, semanticText: "События" });
    expect(result.events).toEqual([]); expect(result.items).toEqual([]);
  });

  it("original local date wins over a different date supplied by planner", async () => {
    const tomorrow = event("tomorrow", { startsAt: "2026-10-20T19:30:00Z" }); // already next day in Astana
    const result = await answerPilotChatWithEvents("События сегодня", context, {
      getEvents: async () => data([event("today"), tomorrow]), now: () => now, forceEvents: true, semanticText: "События завтра" });
    expect(result.events.map(item => item.id)).toEqual(["today"]);
    expect("eventRetrieval" in result && result.eventRetrieval.constraints.timeWindow.kind).toBe("today");
  });

  it("parses original strict budget before matching and never turns unknown/from price into free", async () => {
    const free = event("free", { price: { kind: "exact", minMinor: 0, currency: "KZT", basis: "unknown" },
      provenance: { ...event("free").provenance, priceQuality: "observed" } });
    const paid = event("paid", { price: { kind: "exact", minMinor: 500000, currency: "KZT", basis: "unknown" },
      provenance: { ...event("paid").provenance, priceQuality: "observed" } });
    const from = event("from", { price: { kind: "from", minMinor: 0, currency: "KZT", basis: "unknown" },
      provenance: { ...event("from").provenance, priceQuality: "observed" } });
    const result = await answerPilotChatWithEvents("Хочу куда-нибудь выбраться до 0 ₸", context, {
      getEvents: async () => data([event("unknown"), paid, from, free]), now: () => now, forceEvents: true, semanticText: "События" });
    expect(result.events.map(item => item.id)).toEqual(["free"]);
    expect(result.proposedContext).toMatchObject({ budget: 0, strictBudget: true });
  });

  it("does not fabricate cinema sessions merely because planner requested events", async () => {
    const getEvents = vi.fn().mockResolvedValue(data([theatre]));
    const result = await answerPilotChatWithEvents("Хочу кино", context, { getEvents, forceEvents: true, semanticText: "Спектакли" });
    expect(result.events).toEqual([]); expect(result.items).toEqual([]); expect(getEvents).not.toHaveBeenCalled();
  });
});
