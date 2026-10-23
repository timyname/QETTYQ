import { describe, expect, it } from "vitest";
import { containsPlaceName, isNegatedMention, placeCategoryQuery } from "../../src/server/retrieval/lexical-query";
import { searchPilotPlaces } from "../../src/server/pilot/catalog";
import { retrieveEventEvidence } from "../../src/server/ingestion/event-evidence";
import { pilotContextSchema } from "../../src/server/pilot/contracts";
import type { Place } from "../../src/domain/types";
import type { LiveAstanaEvent } from "../../src/server/ingestion/sxodim-live";
import type { LiveEventsResult } from "../../src/server/ingestion/live-events";

// Independent synthetic fixtures, not gold/holdout-derived or production data.
const now = Date.parse("2026-11-03T07:00:00Z");
const ctx = pilotContextSchema.parse({});
const place = (id: string, name: string, category: string, patch: Partial<Place> = {}): Place => ({
  id, name, category, lat: 51.13, lon: 71.43, address: null, tags: [category, "culture"], price: null,
  durationMinutes: 30, sourceUrl: "https://example.invalid/synthetic", sourceName: "SYNTHETIC TEST", retrievedAt: "2026-11-03T00:00:00Z", dataMode: "snapshot", ...patch,
});
const event = (id: string, name: string, category: string, patch: Partial<LiveAstanaEvent> = {}): LiveAstanaEvent => ({
  id, name, category, cityId: "astana", venueName: null, address: null, lat: null, lon: null,
  startsAt: "2026-11-03T14:00:00Z", endsAt: null, durationMinutes: null, timeZone: "Asia/Almaty", contentLanguage: "und",
  priceFromKzt: null, price: { kind: "unknown", minMinor: null, currency: null, basis: "unknown" }, status: "scheduled", availability: "unknown",
  bookingUrl: null, contactUrl: "https://example.invalid/synthetic", organizerUrl: null, image: null,
  requiredCredit: { text: "SYNTHETIC TEST", url: "https://example.invalid/synthetic" }, fetchedAt: "2026-11-03T06:50:00Z",
  provenance: { sourceId: "synthetic", sourceUrl: "https://example.invalid/synthetic", parserVersion: "sxodim-jsonld-v1", scheduleQuality: "observed", priceQuality: "unknown" }, warnings: [], ...patch,
});
const pool = [event("concert", "SYNTHETIC TEST · Концерт камерной музыки", "Концерты"), event("play", "SYNTHETIC TEST · Спектакль Листья", "Театр")];
const feed = (items = pool): LiveEventsResult => ({ items, dataMode: "snapshot", freshness: "fresh", cacheStatus: "hit", fetchedAt: "2026-11-03T06:50:00Z", expiresAt: "2026-11-03T07:50:00Z", source: null, coverage: null, warnings: [] });

describe("bounded multilingual lexical query v2", () => {
  it.each(["no concerts", "without concerts", "don't want a concert", "avoid concerts", "концерт емес", "концерт керек емес", "концертсіз"])("local exclusion: %s", query => {
    expect(retrieveEventEvidence(feed(), query, ctx, now).items.map(value => value.id)).toEqual(["play"]);
  });
  it("keeps not-only positive and does not propagate exclusion to another clause", () => {
    expect(retrieveEventEvidence(feed(), "not only concerts", ctx, now).items.map(value => value.id)).toEqual(["concert"]);
    expect(retrieveEventEvidence(feed(), "no concerts, theatre please", ctx, now).items.map(value => value.id)).toEqual(["play"]);
  });
  it("supports KK request framing, category and local tomorrow without changing event dates", () => {
    const future = event("tomorrow", "SYNTHETIC TEST · Көрме", "Выставки", { startsAt: "2026-11-04T14:00:00Z" });
    expect(retrieveEventEvidence(feed([future, ...pool]), "Ертең Астанада көрме көрсет", ctx, now).items.map(value => value.id)).toEqual(["tomorrow"]);
  });
  it("maps documented workshop wording, not arbitrary artist/activity text", () => {
    const workshop = event("workshop", "SYNTHETIC TEST · Мастер-класс по глине", "Мастер-классы");
    expect(retrieveEventEvidence(feed([workshop]), "Шеберлік сабағын көрсет", ctx, now).items.map(value => value.id)).toEqual(["workshop"]);
    expect(retrieveEventEvidence(feed([workshop]), "workshop NonexistentArtist", ctx, now).items).toEqual([]);
  });
  it("retains strict unknown-price and unavailable-feed rejection", () => {
    expect(retrieveEventEvidence(feed(), "concerts", { ...ctx, budget: 2000, strictBudget: true }, now).items).toEqual([]);
    expect(retrieveEventEvidence({ ...feed(), dataMode: "unavailable" }, "concerts", ctx, now).items).toEqual([]);
  });
  it("recognizes KK restaurant/library aliases without inventing menu or hours", () => {
    expect(placeCategoryQuery("Мейрамхана емес, кітапхана көрсет")).toEqual({ wanted: ["library"], excluded: ["restaurant"] });
  });
  it("selects exact observed name or observed translation, not all same-category records", () => {
    const places = [place("other", "Театр Север", "theatre"), place("target", "Театр Весна", "theatre", { nameTranslations: { en: "Spring Theatre" } })];
    expect(searchPilotPlaces(ctx, "Найди Театр Весна", places, now).map(value => value.id)).toEqual(["target"]);
    expect(searchPilotPlaces(ctx, "Find Spring Theatre", places, now).map(value => value.id)).toEqual(["target"]);
    expect(containsPlaceName("Museumshouse", "Museum")).toBe(false);
  });
  it("keeps exact-name matching below budget/time eligibility and preserves distinct branches", () => {
    const places = [place("a", "Театр Весна", "theatre", { price: { min: 7000, max: 7000 } }), place("b", "Театр Весна", "theatre")];
    expect(searchPilotPlaces({ ...ctx, budget: 1000, strictBudget: true }, "Театр Весна", places, now)).toEqual([]);
    expect(searchPilotPlaces(ctx, "Театр Весна", places, now).map(value => value.id)).toEqual(["a", "b"]);
    expect(searchPilotPlaces({ ...ctx, origin: { lat: 51.13, lon: 71.43 }, minutes: 20 }, "Театр Весна", places, now)).toEqual([]);
  });
  it("excludes a POI category rather than interpreting its negation as a preference", () => {
    const places = [place("museum", "SYNTHETIC TEST Museum One", "museum"), place("theatre", "SYNTHETIC TEST Theatre Two", "theatre")];
    expect(searchPilotPlaces(ctx, "no museums, theatre", places, now).map(value => value.id)).toEqual(["theatre"]);
  });
  it("shares replacement scope, while not-only does not negate a mention", () => {
    const q = "standup instead of food", match = [...q.matchAll(/food/gu)][0];
    expect(isNegatedMention(q, match)).toBe(true);
    const positive = "not only food";
    expect(isNegatedMention(positive, [...positive.matchAll(/food/gu)][0])).toBe(false);
  });
});
