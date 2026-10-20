import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { DATASTORE_SCHEMA_V1 } from "../../src/server/datastore/schema";
import { DATA_HUB_SCHEMA_V1 } from "../../src/server/data-hub/schema";
import { createDataHubRepository, hubHash } from "../../src/server/data-hub/repository";
import { createDataHubService } from "../../src/server/data-hub/service";
import { DATA_HUB_MAX_BYTES, type HubRecord } from "../../src/server/data-hub/contracts";
import { createPublicDataHubFeed } from "../../src/server/data-hub/public-feed";
import { createHubEventsBridge } from "../../src/server/data-hub/events-bridge";
import type { LiveEventsResult } from "../../src/server/ingestion/live-events";

const NOW = Date.parse("2026-10-21T12:00:00Z");
const TOKEN = "synthetic_offline_producer_token_not_a_real_secret";
const SOURCE = "synthetic-approved", URL_BASE = "https://source.example.org/";
const databases: DatabaseSync[] = [];
function setup(options: { maxBatchesPerMinute?: number; maxRecordsPerDay?: number; maxBytesPerDay?: number } = {}) {
  const db = new DatabaseSync(":memory:"); databases.push(db); db.exec(DATASTORE_SCHEMA_V1 + DATA_HUB_SCHEMA_V1);
  db.prepare("INSERT INTO data_sources VALUES(?,?,?,?,?,?,?,?,?)").run(SOURCE, "SYNTHETIC TEST", `${URL_BASE}policy`, 1, 1, 0, 0, "SYNTHETIC TEST credit", 60);
  const clock = { value: NOW }, repository = createDataHubRepository(db, () => clock.value);
  const producer = { id: "synthetic-producer", tokenHash: hubHash(TOKEN), sourceIds: [SOURCE, "threads-candidate"],
    sourceHosts: { [SOURCE]: ["source.example.org"], "threads-candidate": ["www.threads.com"] },
    cities: ["astana"] as "astana"[], enabled: true, ...options };
  repository.registerProducer(producer);
  return { db, repository, service: createDataHubService(repository), producer, clock };
}
afterEach(() => { for (const db of databases.splice(0)) db.close(); vi.restoreAllMocks(); });
function provenance(field: string) {
  return { field, quality: "observed" as const, method: "source" as const, methodId: null,
    sourceUrl: `${URL_BASE}facts`, fetchedAt: new Date(NOW - 60_000).toISOString(), expiresAt: new Date(NOW + 3600_000).toISOString() };
}
function base(externalId: string) {
  return { sourceId: SOURCE, externalId, revision: 1, sourceUrl: `${URL_BASE}${externalId}`,
    fetchedAt: new Date(NOW - 60_000).toISOString(), expiresAt: new Date(NOW + 3600_000).toISOString(), dataMode: "snapshot" as const, media: [] };
}
function place(): HubRecord {
  return { ...base("venue-1"), kind: "place", facts: { cityId: "astana", name: "SYNTHETIC TEST venue", category: null,
    address: null, coordinates: null, openingHours: null, tags: [] }, provenance: [provenance("name")] };
}
function event(): HubRecord {
  return { ...base("event-1"), kind: "event", facts: { cityId: "astana", name: "SYNTHETIC TEST event", category: null,
    venueExternalId: "venue-1", organizerUrl: null, bookingUrl: null, description: null }, provenance: [provenance("name")] };
}
function occurrence(): HubRecord {
  return { ...base("occurrence-1"), kind: "occurrence", facts: { cityId: "astana", eventExternalId: "event-1", venueExternalId: "venue-1",
    startsAt: new Date(NOW + 600_000).toISOString(), endsAt: null, timeZone: "Asia/Almaty", status: "scheduled", languages: ["und"], availability: "unknown" },
    provenance: [provenance("startsAt"), provenance("timeZone"), provenance("status")] };
}
function offer(): HubRecord {
  return { ...base("offer-1"), kind: "offer", facts: { cityId: "astana", appliesTo: { kind: "occurrence", externalId: "occurrence-1" },
    priceKind: "unknown", minMinor: null, maxMinor: null, currency: null, basis: "unknown", validFrom: null, validUntil: null,
    availability: "unknown", bookingUrl: null }, provenance: [] };
}
const body = (records: unknown[], batchId = "synthetic-batch-1") => ({ schemaVersion: 1, batchId, records });
function request(value: unknown, headers: Record<string, string> = {}) {
  return new Request("https://qettyq.example/api/internal/data-hub/batches", { method: "POST", headers: {
    authorization: `Bearer ${TOKEN}`, "content-type": "application/json", ...headers }, body: JSON.stringify(value) });
}
async function send(state: ReturnType<typeof setup>, records: unknown[], batchId?: string) {
  const response = await state.service.handle(request(body(records, batchId)));
  return { status: response.status, result: await response.json() };
}

describe("Data Hub M2M service and real SQLite inbox (offline synthetic facts)", () => {
  it("normalizes linked place/event/occurrence/offer in one durable out-of-order batch without any fetch", async () => {
    const state = setup(), network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("NETWORK_FORBIDDEN"));
    const response = await send(state, [offer(), occurrence(), event(), place()]);
    expect(response.status).toBe(202); expect(response.result).toMatchObject({ accepted: 4, quarantined: 0, duplicate: 0 });
    for (const table of ["places", "events", "occurrences", "offers"]) expect(state.db.prepare(`SELECT COUNT(*) AS count FROM qettyq_hub_${table}`).get()?.count).toBe(1);
    const accepted = state.repository.readAcceptedRows({ kind: "occurrence", cityId: "astana", now: NOW });
    expect(accepted[0]).toMatchObject({ facts: { availability: "unknown", languages: ["und"], endsAt: null }, allowLlm: false });
    expect(state.repository.listAccepted({ kind: "occurrence", cityId: "astana", forLlm: true })).toEqual([]);
    expect(state.db.prepare("SELECT min_minor,currency,price_kind FROM qettyq_hub_offers").get()).toMatchObject({ min_minor: null, currency: null, price_kind: "unknown" });
    expect(network).not.toHaveBeenCalled(); expect(JSON.stringify(response.result)).not.toContain(TOKEN);
  });

  it("is idempotent by producer/batch and source/kind/externalID/revision, detecting conflicts", async () => {
    const state = setup();
    expect((await send(state, [place()])).result.accepted).toBe(1);
    expect(await send(state, [place()])).toMatchObject({ status: 200, result: { replay: true, accepted: 1 } });
    expect((await send(state, [place()], "synthetic-batch-2")).result).toMatchObject({ accepted: 0, duplicate: 1 });
    const changed = place(); if (changed.kind === "place") changed.facts.name = "SYNTHETIC TEST conflicting";
    expect(await send(state, [changed])).toMatchObject({ status: 409, result: { error: { code: "HUB_BATCH_CONFLICT" } } });
    const conflict = await send(state, [changed], "synthetic-batch-3");
    expect(conflict.result.records[0]).toMatchObject({ status: "quarantined", reasons: expect.arrayContaining(["REVISION_CONFLICT"]) });
    expect(state.repository.listAccepted({ kind: "place", cityId: "astana" })[0].facts).toHaveProperty("name", "SYNTHETIC TEST venue");
  });

  it("updates place revisions without deleting referenced events, and never replaces last-good with stale/quarantined data", async () => {
    const state = setup(); await send(state, [place(), event(), occurrence()]);
    const second = place(); second.revision = 2; if (second.kind === "place") second.facts.name = "SYNTHETIC TEST updated";
    expect((await send(state, [second], "revision-2")).result.accepted).toBe(1);
    const stale = place(); stale.revision = 3; stale.fetchedAt = new Date(NOW - 120_000).toISOString();
    expect((await send(state, [stale], "revision-3")).result.records[0].reasons).toContain("STALE_REVISION");
    expect(state.repository.listAccepted({ kind: "place", cityId: "astana" })[0]).toMatchObject({ revision: 2, facts: { name: "SYNTHETIC TEST updated" } });
    expect(state.db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("quarantines unknown-rights Threads metadata WITHOUT storing a post payload or approving the source", async () => {
    const state = setup(), record = place(); record.sourceId = "threads-candidate"; record.sourceUrl = "https://www.threads.com/@synthetic/post/test";
    record.provenance[0].sourceUrl = record.sourceUrl;
    const result = (await send(state, [record])).result;
    expect(result).toMatchObject({ accepted: 0, quarantined: 1 });
    expect(result.records[0].reasons).toContain("SOURCE_PERSIST_NOT_APPROVED");
    expect(state.db.prepare("SELECT payload_json FROM qettyq_hub_records").get()?.payload_json).toBeNull();
    expect(state.repository.listQuarantined()[0]).toMatchObject({ sourceId: "threads-candidate", sourceUrl: record.sourceUrl });
    expect(JSON.stringify(state.repository.listQuarantined())).not.toContain("SYNTHETIC TEST venue");
    expect(state.db.prepare("SELECT COUNT(*) AS count FROM data_sources").get()?.count).toBe(1);
    expect(state.repository.listAccepted({ kind: "place", cityId: "astana" })).toEqual([]);
  });

  it("requires a hash-authenticated scoped enabled producer and rejects browser/cookie substitution", async () => {
    const state = setup();
    for (const headers of [{ authorization: "" }, { authorization: `Bearer ${"X".repeat(40)}` }]) {
      expect((await state.service.handle(request(body([place()]), headers))).status).toBe(401);
    }
    expect((await state.service.handle(request(body([place()]), { origin: "https://qettyq.example" }))).status).toBe(403);
    expect((await state.service.handle(request(body([place()]), { authorization: "", cookie: "qettyq_session=untrusted" }))).status).toBe(401);
    const scoped = place(); scoped.sourceId = "not-authorized";
    expect((await send(state, [scoped])).status).toBe(403);
    expect(state.db.prepare("SELECT COUNT(*) AS count FROM qettyq_hub_batches").get()?.count).toBe(0);
    state.repository.registerProducer({ ...state.producer, enabled: false });
    expect((await send(state, [place()])).status).toBe(401);
    expect(state.db.prepare("SELECT token_hash FROM qettyq_hub_producers").get()?.token_hash).toBe(hubHash(TOKEN));
  });

  it("quarantines source/provenance host spoofing and private metadata URLs, without resolving them", async () => {
    const state = setup();
    for (const [index, url] of ["https://evil.example/", "https://source.example.org.evil.example/", "http://127.0.0.1/", "https://127.0.0.1/", "https://user:pass@source.example.org/"].entries()) {
      const record = place(); record.externalId = `host-${index}`; record.sourceUrl = url;
      const result = await send(state, [record], `batch-${index}`);
      expect(result.result.quarantined).toBe(1);
    }
    const record = place(); record.provenance[0].sourceUrl = "https://evil.example/fact";
    expect((await send(state, [record], "evidence-host")).result.records[0].reasons).toContain("SOURCE_HOST_NOT_APPROVED");
  });

  it("requires source-backed explicit time/zone and same-source event/place references", async () => {
    const state = setup();
    expect((await send(state, [occurrence()])).result.records[0].reasons).toContain("EVENT_REFERENCE_UNRESOLVED");
    const missing = occurrence(); if (missing.kind === "occurrence") missing.facts.startsAt = null;
    expect((await send(state, [missing], "unknown-time")).result.records[0].reasons).toContain("START_TIME_UNKNOWN");
    const ambiguous = occurrence() as unknown as { facts: { startsAt: string } }; ambiguous.facts.startsAt = "2026-10-21";
    expect((await send(state, [ambiguous], "ambiguous-date")).result.records[0].reasons).toContain("SCHEMA_INVALID");
  });

  it("does not turn unknown price into free or trust LLM-produced money", async () => {
    const state = setup(); await send(state, [place(), event(), occurrence()]);
    const inferred = offer(); if (inferred.kind === "offer") inferred.facts.minMinor = 0;
    expect((await send(state, [inferred], "bad-unknown-price")).result.records[0].reasons).toContain("UNKNOWN_PRICE_HAS_AMOUNT");
    const llm = offer(); llm.externalId = "llm-price";
    if (llm.kind === "offer") { llm.facts.priceKind = "exact"; llm.facts.minMinor = 0; llm.facts.maxMinor = 0; llm.facts.currency = "KZT"; }
    llm.provenance = [{ ...provenance("price"), method: "llm" }];
    expect((await send(state, [llm], "llm-money")).result.records[0].reasons).toContain("LLM_FACT_REQUIRES_REVIEW");
  });

  it("separates photo rights: producer license text never grants display/download/LLM; only trusted exact-asset grant does", async () => {
    const state = setup(), record = place();
    record.media = [{ externalId: "photo-1", url: "https://cdn.example.org/synthetic.jpg", sourceUrl: `${URL_BASE}photo`, type: "real_place_photo",
      author: "SYNTHETIC TEST author", license: "producer-claimed-license", evidenceUrl: `${URL_BASE}claim` }];
    expect((await send(state, [record])).result.accepted).toBe(1);
    expect(state.repository.listAccepted({ kind: "place", cityId: "astana" })[0].media).toEqual([]);
    state.repository.registerMediaGrant({ sourceId: SOURCE, assetUrl: record.media[0].url, license: "SYNTHETIC TEST grant", evidenceUrl: `${URL_BASE}reviewed-grant`,
      credit: "SYNTHETIC TEST approved credit", allowDisplay: true, allowDownload: false, allowLlm: false, expiresAtMs: NOW + 3600_000 });
    expect(state.repository.listAccepted({ kind: "place", cityId: "astana" })[0].media).toHaveLength(1);
    expect(state.repository.listAccepted({ kind: "place", cityId: "astana" })[0].media[0]).toMatchObject({
      license: "SYNTHETIC TEST grant", credit: "SYNTHETIC TEST approved credit", evidenceUrl: `${URL_BASE}reviewed-grant` });
    expect(state.db.prepare("SELECT allow_download,allow_llm FROM qettyq_hub_media").get()).toMatchObject({ allow_download: 0, allow_llm: 0 });
  });

  it("enforces current source revocation and expires feed facts/media, not a cached approval", async () => {
    const state = setup(); await send(state, [place()]);
    state.db.prepare("UPDATE data_sources SET allow_display=0 WHERE id=?").run(SOURCE);
    expect(state.repository.listAccepted({ kind: "place", cityId: "astana" })).toEqual([]);
    state.db.prepare("UPDATE data_sources SET allow_display=1 WHERE id=?").run(SOURCE);
    expect(state.repository.listAccepted({ kind: "place", cityId: "astana", now: NOW + 3600_000 })).toEqual([]);
  });

  it("enforces durable per-producer/global rate and byte budgets, while free replays remain idempotent", async () => {
    const state = setup({ maxRecordsPerDay: 1 });
    expect((await send(state, [place()])).status).toBe(202);
    expect((await send(state, [place()])).status).toBe(200);
    expect((await send(state, [place()], "next-batch")).status).toBe(429);
    const other = setup();
    other.db.prepare("INSERT INTO qettyq_hub_batches VALUES(?,?,?,?,?,?,?)").run(other.producer.id, "synthetic-budget-proof", "hash", NOW, 1, 50 * 1024 * 1024, "{}");
    expect((await send(other, [place()])).status).toBe(429);
  });

  it("bounds streaming bytes, rejects unversioned/oversized batches and never leaks raw SQL errors", async () => {
    const state = setup();
    expect((await state.service.handle(request({ ...body([place()]), unexpected: true }))).status).toBe(400);
    expect((await state.service.handle(request(body(Array(51).fill(place()))))).status).toBe(400);
    const oversized = request({ padding: "x".repeat(DATA_HUB_MAX_BYTES) });
    expect((await state.service.handle(oversized)).status).toBe(413);
    state.db.exec("DROP TABLE qettyq_hub_producers");
    const response = await state.service.handle(request(body([place()])));
    expect(await response.json()).toEqual({ error: { code: "HUB_STORAGE_UNAVAILABLE" } });
  });

  it("retains durable accepted data through repository restart and preserves explicit cancellation history", async () => {
    const state = setup(); await send(state, [place(), event(), occurrence()]);
    const restarted = createDataHubRepository(state.db, () => NOW);
    expect(restarted.readAcceptedRows({ kind: "occurrence", cityId: "astana", sourceId: SOURCE, externalId: "occurrence-1" })).toHaveLength(1);
    const cancelled = occurrence(); cancelled.revision = 2;
    if (cancelled.kind === "occurrence") cancelled.facts.status = "cancelled";
    expect((await send(state, [cancelled], "cancelled-revision")).result.accepted).toBe(1);
    expect(restarted.readAcceptedRows({ kind: "occurrence", cityId: "astana" })).toEqual([]);
    expect(state.db.prepare("SELECT COUNT(*) AS count FROM qettyq_hub_records WHERE kind='occurrence' AND state='accepted'").get()?.count).toBe(2);
  });

  it("joins the public source-approved feed without fabricating price/language/GPS and excludes expired parent events", async () => {
    const state = setup(); await send(state, [place(), event(), occurrence(), offer()]);
    const feed = createPublicDataHubFeed(state.repository, () => state.clock.value);
    const result = await feed.get({ cityId: "astana" });
    expect(result.events[0]).toMatchObject({ parserVersion: "qettyq-data-hub-v1", name: "SYNTHETIC TEST event", languages: ["und"],
      price: { priceKind: "unknown", minMinor: null, currency: null }, venue: { coordinates: null, openingHours: null } });
    expect(JSON.stringify(result)).not.toMatch(/producer_id|token_hash|payload_json|provenance|source_hosts_json/);
    expect((await feed.get({ cityId: "astana", forLlm: true })).events).toEqual([]);
    state.clock.value += 3600_000;
    expect((await feed.get({ cityId: "astana" })).events).toEqual([]);
  });

  it("merges accepted source-approved events into the existing map/chat DTO and immediately excludes revoked or unknown Threads", async () => {
    const state = setup(), venue = place();
    if (venue.kind !== "place") throw new Error("fixture");
    venue.facts.coordinates = { lat: 51.1, lon: 71.4, quality: "observed", sourceUrl: `${URL_BASE}facts`, methodId: null };
    venue.provenance.push(provenance("coordinates"));
    const ticket = offer(); if (ticket.kind !== "offer") throw new Error("fixture");
    ticket.facts.priceKind = "exact"; ticket.facts.minMinor = 100000; ticket.facts.maxMinor = 100000; ticket.facts.currency = "KZT";
    ticket.facts.basis = "person"; ticket.provenance.push(provenance("price"));
    await send(state, [venue, event(), occurrence(), ticket]);
    const raw: LiveEventsResult = { items: [], dataMode: "unavailable", freshness: "unavailable", fetchedAt: null, expiresAt: null,
      cacheStatus: "miss", source: null, coverage: null, warnings: [] };
    const baseGet = vi.fn(async () => raw), feed = createPublicDataHubFeed(state.repository, () => state.clock.value);
    const bridge = createHubEventsBridge({ baseGet, hubGet: () => feed.get({ cityId: "astana" }), now: () => state.clock.value });
    const merged = await bridge.get();
    expect(baseGet).toHaveBeenCalledOnce(); expect(merged).toMatchObject({ dataMode: "snapshot", source: null, coverage: null });
    expect(merged.items[0]).toMatchObject({ lat: 51.1, lon: 71.4, coordinateQuality: "observed", availability: "unknown",
      price: { kind: "exact", minMinor: 100000, basis: "person" }, priceEvidence: { sourceUrl: `${URL_BASE}offer-1` },
      provenance: { sourceId: SOURCE, parserVersion: "qettyq-data-hub-v1" } });
    expect(merged.items[0].requiredCredit).toEqual({ text: "SYNTHETIC TEST credit", url: `${URL_BASE}occurrence-1` });
    state.db.prepare("UPDATE data_sources SET allow_display=0 WHERE id=?").run(SOURCE);
    expect((await bridge.get()).items).toEqual([]);
    const unknown = place(); unknown.sourceId = "threads-candidate"; unknown.sourceUrl = "https://www.threads.com/@synthetic/post/test";
    unknown.provenance[0].sourceUrl = unknown.sourceUrl; await send(state, [unknown], "threads-never-publish");
    expect((await bridge.get()).items).toEqual([]);
  });

  it("does not misrepresent a reported range as a free/exact/from legacy price", async () => {
    const state = setup(), range = offer(); if (range.kind !== "offer") throw new Error("fixture");
    range.facts.priceKind = "range"; range.facts.minMinor = 100000; range.facts.maxMinor = 300000; range.facts.currency = "KZT";
    range.provenance.push(provenance("price"));
    await send(state, [place(), event(), occurrence(), range]);
    const feed = createPublicDataHubFeed(state.repository, () => NOW);
    const bridge = createHubEventsBridge({ baseGet: async () => ({ items: [], dataMode: "unavailable", freshness: "unavailable", fetchedAt: null, expiresAt: null,
      cacheStatus: "miss", source: null, coverage: null, warnings: [] }), hubGet: () => feed.get({ cityId: "astana" }), now: () => NOW });
    const card = (await bridge.get()).items[0];
    expect(card.price).toEqual({ kind: "unknown", minMinor: null, currency: null, basis: "unknown" });
    expect(card.priceFromKzt).toBeNull(); expect(card.warnings).toContain("RANGE_PRICE_NOT_SUPPORTED_IN_LEGACY_CARD");
    expect((await feed.get({ cityId: "astana" })).events[0].price).toMatchObject({ priceKind: "range", minMinor: 100000, maxMinor: 300000 });
  });

  it("requires provenance for observed/derived coordinates and never guesses missing coordinates", async () => {
    const state = setup(), record = place();
    if (record.kind !== "place") throw new Error("fixture");
    record.facts.coordinates = { lat: 51.1, lon: 71.4, quality: "derived", sourceUrl: `${URL_BASE}facts`, methodId: null };
    expect((await send(state, [record], "missing-method")).result.records[0].reasons).toContain("COORDINATE_METHOD_REQUIRED");
    record.revision = 2; record.facts.coordinates.methodId = "reviewed-area-centroid-v1";
    record.provenance.push({ ...provenance("coordinates"), quality: "derived", method: "algorithm", methodId: "reviewed-area-centroid-v1" });
    expect((await send(state, [record], "derived-coordinates")).result.accepted).toBe(1);
    record.revision = 3; record.facts.coordinates.lat = 43.2;
    expect((await send(state, [record], "wrong-city")).result.records[0].reasons).toContain("OUTSIDE_CITY");
  });

  it("strips expired retained bodies, deletes expired quarantine, and bounds batch metadata retention", async () => {
    const state = setup(); await send(state, [place()]);
    const unknown = place(); unknown.sourceId = "threads-candidate"; unknown.sourceUrl = "https://www.threads.com/@synthetic/post/test";
    unknown.provenance[0].sourceUrl = unknown.sourceUrl;
    await send(state, [unknown], "threads-quarantine");
    state.clock.value += 31 * 86400_000;
    state.repository.purgeExpired();
    expect(state.db.prepare("SELECT COUNT(*) AS count FROM qettyq_hub_records WHERE state='quarantined'").get()?.count).toBe(0);
    expect(state.db.prepare("SELECT payload_json FROM qettyq_hub_records").get()?.payload_json).toBeNull();
    expect(state.db.prepare("SELECT COUNT(*) AS count FROM qettyq_hub_batches").get()?.count).toBe(0);
    expect(state.repository.listAccepted({ kind: "place", cityId: "astana" })).toEqual([]);
  });
});
