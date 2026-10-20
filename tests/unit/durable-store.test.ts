import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { DatabaseSync } from "node:sqlite";
import snapshotJson from "../../data/livedata/sxodim-astana-2026-10-20.json";
import placesJson from "../../data/places.json";
import type { Place } from "../../src/domain/types";
import type { SxodimSnapshot } from "../../src/server/ingestion/sxodim-live";
import { openDatastore } from "../../src/server/datastore/sqlite";
import { createEventsStore } from "../../src/server/datastore/events-store";
import { createClientMemory } from "../../src/server/datastore/client-memory";
import { importD1Ledger, sqlitePublicAIDatabase, type AIReservationExport } from "../../src/server/datastore/public-ai-sqlite";
import { createPublicAIQuota, getPublicAIBudgetStatus, PUBLIC_AI_APPROVAL_ID } from "../../src/server/pilot/public-ai-budget";
import { pilotContextSchema } from "../../src/server/pilot/contracts";

let db: DatabaseSync;
let directory: string;
let time: number;
const seed = () => structuredClone(snapshotJson) as SxodimSnapshot;
const context = pilotContextSchema.parse({ goal: "activity", minutes: 120 });
const token = "client-12345678901234567890123456789012";
const sourcePolicy = { id: "sxodim-astana-noncommercial", name: "Давай Сходим", policyUrl: "https://sxodim.com/polzovatelskoe-soglashenie", allowPersist: true, allowDisplay: true, allowLlm: false, credit: "Давай Сходим", minimumRefreshMinutes: 60 };
const osmPolicy = { ...sourcePolicy, id: "osm-overpass-poi", name: "OSM", policyUrl: "https://www.openstreetmap.org/copyright", allowLlm: true, credit: "© OpenStreetMap contributors" };
function store() { const result = createEventsStore(db); result.registerSource(sourcePolicy); result.registerSource(osmPolicy); return result; }
function importPlaces() { const result = store(); result.importPlaces(placesJson as Place[], { sourceId: osmPolicy.id, expiresAt: "2026-11-19T00:00:00Z" }); return result; }
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "qettyq-sqlite-test-")); db = openDatastore({ path: join(directory, "qettyq.sqlite"), migrate: true }); time = Date.parse("2026-10-20T11:10:00Z"); });
afterEach(() => { db.close(); rmSync(directory, { recursive: true }); });

describe("durable Astana data (real SQLite, zero network)", () => {
  it("persists approved baseline, idempotently upserts, and survives a close/reopen", () => {
    const repository = store();
    expect(repository.importSxodim(seed()).imported).toBe(snapshotJson.items.length);
    expect(repository.importSxodim(seed())).toMatchObject({ imported: 0, skipped: "unchanged" });
    repository.importPlaces(placesJson as Place[], { sourceId: osmPolicy.id, expiresAt: "2026-11-19T00:00:00Z" });
    expect(db.prepare("SELECT COUNT(*) AS n FROM venues WHERE source_id=?").get(osmPolicy.id)?.n).toBe(80);
    expect(db.prepare("SELECT COUNT(*) AS n FROM event_occurrences").get()?.n).toBe(snapshotJson.items.length);
    expect(db.prepare("SELECT COUNT(*) AS n FROM media_rights").get()?.n).toBe(0);
    expect(db.prepare("SELECT quality FROM fact_provenance WHERE field='openingHours' LIMIT 1").get()?.quality).toBe("unknown");
    db.close(); db = openDatastore({ path: join(directory, "qettyq.sqlite") });
    expect(createEventsStore(db).readSnapshot()?.items).toHaveLength(snapshotJson.items.length);
    expect(statSync(join(directory, "qettyq.sqlite")).mode & 0o777).toBe(0o600);
  });
  it("requires source permissions, preserves the last-good snapshot on invalid/older imports", () => {
    const repository = createEventsStore(db);
    expect(() => repository.importSxodim(seed())).toThrow("PERMISSION_REQUIRED");
    repository.registerSource(sourcePolicy); repository.importSxodim(seed());
    const invalid = seed(); invalid.items[1].price.minMinor = -1;
    expect(() => repository.importSxodim(invalid)).toThrow("INVALID_EVENT_PRICE");
    expect(repository.readSnapshot()).toEqual(seed());
    const older = seed(); older.fetchedAt = "2026-10-20T10:00:00Z";
    expect(repository.importSxodim(older).skipped).toBe("older_snapshot");
    expect(db.prepare("SELECT COUNT(*) AS n FROM ingestion_runs").get()?.n).toBe(1);
    repository.registerSource({ ...sourcePolicy, allowDisplay: false });
    expect(repository.readSnapshot()).toBeNull();
    expect(repository.retrieve({ text: "", context, now: time }).items).toEqual([]);
  });
  it("retrieves by Astana local date/query, does not substitute theatre for rock or assume a price", () => {
    const repository = store(); repository.importSxodim(seed());
    const baseline = repository.retrieve({ text: "", context, now: time });
    expect(baseline.items).toHaveLength(3);
    expect(baseline.meta).toMatchObject({ dataMode: "snapshot", freshness: "fresh", routeChecked: false });
    expect(baseline.evidence[0].unknowns).toContain("ROUTE_NOT_CHECKED");
    expect(repository.retrieve({ text: "сегодня", context, now: time }).items).toEqual([]);
    expect(repository.retrieve({ text: "2026-10-22", context, now: time }).items.every(item => item.startsAt.startsWith("2026-10-22"))).toBe(true);
    expect(repository.retrieve({ text: "", context: { ...context, goal: "new", likedTags: ["rock", "live_music"] }, now: time }).items).toEqual([]);
    expect(repository.retrieve({ text: "", context: { ...context, budget: 0, strictBudget: true }, now: time }).items.every(item => item.price.kind === "exact" && item.price.minMinor === 0)).toBe(true);
    expect(repository.retrieve({ text: "", context, now: time, near: { lat: 51.1, lon: 71.4, radiusKm: 10 } }).items).toEqual([]);
    expect(repository.retrieve({ text: "", context, now: time, forLlm: true }).items).toEqual([]);
    repository.registerSource({ ...sourcePolicy, allowLlm: true });
    expect(repository.retrieve({ text: "", context, now: time, forLlm: true }).items.length).toBeGreaterThan(0);
  });
  it("excludes expired records by default, returns explicitly stale evidence only when requested", () => {
    const repository = store(); repository.importSxodim(seed());
    const later = Date.parse("2026-10-20T13:00:00Z");
    expect(repository.retrieve({ text: "", context, now: later }).items).toEqual([]);
    expect(repository.retrieve({ text: "", context, now: later, allowStale: true }).evidence[0]).toMatchObject({ dataMode: "snapshot", freshness: "stale" });
    expect(repository.retrieve({ text: "", context, now: Date.parse("2026-10-20T10:00:00Z") }).items).toEqual([]);
  });
  it("treats absent Saturday hours as unknown, checks entire visit and conflicting/expired facts", () => {
    const repository = importPlaces(); const placeId = placesJson[0].id;
    const saturday = Date.parse("2026-10-24T11:00:00+05:00");
    expect(repository.openingStatus(placeId, saturday, saturday + 3600_000)).toBe("unknown");
    const fact = { id: "hours-sat", venueId: placeId, sourceId: osmPolicy.id, weekday: 6, state: "open" as const, opensMinute: 600, closesMinute: 1080, completeDay: true, sourceUrl: placesJson[0].sourceUrl, fetchedAt: "2026-10-20T10:00:00Z", expiresAt: "2026-11-01T00:00:00Z" };
    repository.saveOpeningHours([fact]);
    expect(repository.openingStatus(placeId, saturday, saturday + 3600_000)).toBe("open");
    const evening = Date.parse("2026-10-24T17:30:00+05:00");
    expect(repository.openingStatus(placeId, evening, evening + 3600_000)).toBe("unknown");
    const night = Date.parse("2026-10-24T20:00:00+05:00");
    expect(repository.openingStatus(placeId, night, night + 3600_000)).toBe("closed");
    repository.saveOpeningHours([{ ...fact, id: "contradictory-closed", state: "closed", opensMinute: null, closesMinute: null }]);
    expect(repository.openingStatus(placeId, saturday, saturday + 3600_000)).toBe("unknown");
    expect(repository.openingStatus(placeId, saturday + 14 * 86400_000, saturday + 14 * 86400_000 + 3600_000)).toBe("unknown");
    expect(() => repository.saveOpeningHours([{ ...fact, opensMinute: 1100, closesMinute: 600 }])).toThrow();
    expect(() => repository.saveOpeningHours([{ ...fact, opensMinute: null, closesMinute: null }])).toThrow();
    expect(() => repository.saveOpeningHours([{ ...fact, sourceId: "unapproved-museum" }])).toThrow("PERMISSION_REQUIRED");
  });
  it("filters places without inventing ETA, price, open status or a match for unsupported interests", () => {
    const repository = importPlaces();
    const found = repository.retrievePlaces({ context: { ...context, goal: "food" }, now: time, near: { lat: placesJson[0].lat, lon: placesJson[0].lon, radiusKm: 0.1 } });
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]).toMatchObject({ openingStatus: "unknown", travelMinutes: null, feasibility: "uncertain", distanceQuality: "straight_line", price: null });
    expect(repository.retrievePlaces({ context: { ...context, goal: "new", likedTags: ["armwrestling"] }, now: time })).toEqual([]);
    expect(repository.retrievePlaces({ context: { ...context, budget: 100000, strictBudget: true }, now: time })).toEqual([]);
    expect(repository.retrievePlaces({ context, now: time, requireOpen: true })).toEqual([]);
    expect(repository.retrievePlaces({ context: { ...context, minutes: 20 }, now: time, query: placesJson[0].name })).toEqual([]);
    expect(() => repository.retrievePlaces({ context, near: { lat: NaN, lon: 0, radiusKm: 1 } })).toThrow("INVALID_NEAR_FILTER");
  });
  it("rejects an implicit/relative/ephemeral production database", () => {
    expect(() => openDatastore({ path: ":memory:", production: true })).toThrow("DURABLE_DATABASE_PATH_REQUIRED");
    expect(() => openDatastore({ path: "relative.sqlite", production: true })).toThrow("DURABLE_DATABASE_PATH_REQUIRED");
  });
  it("shares an atomic hourly source refresh lease across connections and does not retry failed attempts", () => {
    const repository = store();
    expect(() => repository.acquireSourceRefresh(sourcePolicy.id, time)).toThrow("FETCH_PERMISSION_REQUIRED");
    repository.registerSource({ ...sourcePolicy, allowFetch: true });
    expect(repository.acquireSourceRefresh(sourcePolicy.id, time)).toBe(true);
    const second = openDatastore({ path: join(directory, "qettyq.sqlite") });
    try {
      expect(createEventsStore(second).acquireSourceRefresh(sourcePolicy.id, time)).toBe(false);
      expect(createEventsStore(second).acquireSourceRefresh(sourcePolicy.id, time + 3599_999)).toBe(false);
      expect(createEventsStore(second).acquireSourceRefresh(sourcePolicy.id, time + 3600_000)).toBe(true);
    } finally { second.close(); }
  });
});

describe("consent-scoped durable memory", () => {
  it("does not store preferences/dialogue without explicit consent or retain precise GPS", () => {
    const memory = createClientMemory(db, () => time);
    expect(() => memory.saveProfile(token, { likedTags: ["rock"], locale: "ru" })).toThrow("CONSENT_REQUIRED:profile");
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_clients").get()?.n).toBe(0);
    memory.grantConsent(token, "profile", "persistent_30d");
    memory.saveProfile(token, { likedTags: ["rock"], locale: "kk" });
    expect(memory.readProfile(token)).toEqual({ likedTags: ["rock"], locale: "kk" });
    expect(() => memory.saveProfile(token, { likedTags: [], locale: "ru", origin: { lat: 51.1111, lon: 71.1111 } } as never)).toThrow();
    expect(memory.hasConsent(token, "ai_transfer")).toBe(false);
    expect(() => memory.aiContext(token)).toThrow("CONSENT_REQUIRED:ai_transfer");
    memory.grantConsent(token, "dialogue", "session_24h");
    memory.appendMessage(token, { id: "message-1", role: "user", mode: "user", text: "Я у 51.123456, 71.123456" });
    expect(memory.messages(token)[0].text).not.toContain("51.123456");
    expect(JSON.stringify(db.prepare("SELECT * FROM memory_clients").all())).not.toContain(token);
    memory.grantConsent(token, "ai_transfer", "session_24h");
    expect(memory.aiContext(token).history).toHaveLength(1);
  });
  it("does not extend old message retention when consent is renewed before expiry", () => {
    const memory = createClientMemory(db, () => time);
    memory.grantConsent(token, "dialogue", "session_24h");
    memory.appendMessage(token, { id: "old-message", role: "user", mode: "user", text: "Старое" });
    time += 12 * 3600_000;
    memory.grantConsent(token, "dialogue", "session_24h");
    memory.appendMessage(token, { id: "new-message", role: "user", mode: "user", text: "Новое" });
    time += 12 * 3600_000 + 1;
    expect(memory.hasConsent(token, "dialogue")).toBe(true);
    expect(memory.messages(token).map(message => message.id)).toEqual(["new-message"]);
    memory.purgeExpired();
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_messages").get()?.n).toBe(1);
  });
  it("retains 24 messages, is idempotent, and does not resurrect expired scoped data on renewal", () => {
    const memory = createClientMemory(db, () => time);
    memory.grantConsent(token, "profile", "persistent_30d");
    memory.grantConsent(token, "dialogue", "session_24h");
    for (let index = 0; index < 30; index++) memory.appendMessage(token, { id: `message-${index}`, role: "user", mode: "user", text: `Текст ${index}` });
    expect(memory.messages(token)).toHaveLength(24);
    expect(memory.messages(token)[0].id).toBe("message-6");
    memory.appendMessage(token, { id: "message-29", role: "user", mode: "user", text: "Текст 29" });
    expect(memory.messages(token)).toHaveLength(24);
    expect(() => memory.appendMessage(token, { id: "message-29", role: "user", mode: "user", text: "Другое" })).toThrow("MESSAGE_ID_CONFLICT");
    time += 86400_001;
    expect(memory.messages(token)).toEqual([]);
    memory.grantConsent(token, "dialogue", "session_24h");
    expect(memory.messages(token)).toEqual([]);
    expect(memory.hasConsent(token, "profile")).toBe(true);
  });
  it("records visits only by an explicit consented action, revokes/deletes/purges cascading rows", () => {
    importPlaces(); const memory = createClientMemory(db, () => time);
    expect(() => memory.markVisited(token, { entityKind: "venue", entityId: placesJson[0].id, visitedAtMs: time })).toThrow("CONSENT_REQUIRED:visits");
    memory.grantConsent(token, "visits", "session_24h");
    expect(memory.visits(token)).toEqual([]);
    expect(() => memory.markVisited(token, { entityKind: "venue", entityId: placesJson[0].id, visitedAtMs: time + 1 })).toThrow("INVALID_VISIT");
    memory.markVisited(token, { entityKind: "venue", entityId: placesJson[0].id, visitedAtMs: time });
    expect(memory.visits(token)[0].confirmation).toBe("user_confirmed");
    memory.revokeConsent(token, "visits");
    expect(memory.visits(token)).toEqual([]);
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_visits").get()?.n).toBe(0);
    memory.grantConsent(token, "dialogue", "session_24h");
    memory.appendMessage(token, { id: "message-1", role: "assistant", mode: "deterministic", text: "Текст" });
    memory.deleteClient(token);
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_messages").get()?.n).toBe(0);
    memory.grantConsent(token, "profile", "session_24h"); time += 86400_001;
    expect(memory.purgeExpired()).toBe(1);
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_consents").get()?.n).toBe(0);
  });
});

describe("D1 → SQLite public AI ledger, no new approval", () => {
  const proof = { approvalId: PUBLIC_AI_APPROVAL_ID, source: "cloudflare-d1", sourceFrozen: true, verifiedRowCount: 0 } as const;
  it("fails closed until explicit verified frozen export, including an empty old ledger", async () => {
    const adapter = sqlitePublicAIDatabase(db);
    expect((await getPublicAIBudgetStatus(adapter, "session", () => time)).available).toBe(false);
    expect(await createPublicAIQuota({ db: adapter, sessionId: "session", requestId: "request-00001", now: () => time }).reserve()).toBe(false);
    expect(() => importD1Ledger(db, [], { ...proof, sourceFrozen: false as never })).toThrow("PROOF_REQUIRED");
    importD1Ledger(db, [], proof);
    expect((await getPublicAIBudgetStatus(adapter, "session", () => time)).remainingCalls).toBe(20);
    const quota = createPublicAIQuota({ db: adapter, sessionId: "session", requestId: "request-00001", now: () => time });
    expect(await quota.reserve()).toBe(true);
    expect((await getPublicAIBudgetStatus(adapter, "other", () => time)).reason).toBe("PUBLIC_AI_BUSY");
    expect(await quota.complete!({ model: "gpt-5.5", serviceTier: "default", inputTokens: 1000, outputTokens: 100, toolCalls: 0 })).toBe(true);
    db.close(); db = openDatastore({ path: join(directory, "qettyq.sqlite") });
    expect((await getPublicAIBudgetStatus(sqlitePublicAIDatabase(db), "other", () => time)).remainingCalls).toBe(19);
    importD1Ledger(db, [], proof);
    expect((await getPublicAIBudgetStatus(sqlitePublicAIDatabase(db), "other", () => time)).remainingCalls).toBe(19);
  });
  it("preserves exhausted/blocked/reserved approvals and rejects conflicting or duplicate imports", async () => {
    const rows: AIReservationExport[] = Array.from({ length: 20 }, (_, index) => ({ request_id: `old-request-${index.toString().padStart(8, "0")}`, approval_id: PUBLIC_AI_APPROVAL_ID, session_hash: "a".repeat(64), reserved_at_ms: time, utc_day: "2026-10-20", reserve_micro_usd: 500000, status: index === 0 ? "blocked" : "completed" }));
    importD1Ledger(db, rows, { ...proof, verifiedRowCount: 20 });
    const result = await getPublicAIBudgetStatus(sqlitePublicAIDatabase(db), "new-session", () => time);
    expect(result).toMatchObject({ available: false, remainingCalls: 0, reason: "PUBLIC_ACCOUNTING_BLOCKED", reservedMicroUsd: 10000000 });
    expect(() => importD1Ledger(db, [], proof)).toThrow("REIMPORT_REQUIRES_REVIEW");
    expect(() => importD1Ledger(db, [rows[0], rows[0]], { ...proof, verifiedRowCount: 2 })).toThrow("DUPLICATE_D1_REQUEST");
    expect(db.prepare("SELECT SUM(reserve_micro_usd) AS n FROM qettyq_ai_public_reservations").get()?.n).toBe(10000000);
  });
});
