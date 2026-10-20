import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { atomic } from "../datastore/sqlite";
import { DATA_HUB_MAX_BYTES, DATA_HUB_MAX_RECORDS, hubId, hubRecordSchema, publicUrl, sourceId, type HubBatchResult, type HubKind, type HubProducer, type HubRecord, type HubRecordResult } from "./contracts";

export const hubHash = (value: string) => createHash("sha256").update(value).digest("hex");
export function canonicalHubJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalHubJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonicalHubJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export const hubEntityId = (source: string, kind: HubKind, externalId: string) => `hub:${kind}:${hubHash(`${source}:${externalId}`)}`;
const iso = (value: string) => new Date(value).toISOString();
function normalizedRecord(record: HubRecord): HubRecord {
  return JSON.parse(JSON.stringify(record, (key, value: unknown) =>
    ["fetchedAt", "expiresAt", "startsAt", "endsAt", "validFrom", "validUntil"].includes(key) && typeof value === "string" ? iso(value) : value)) as HubRecord;
}
const rank: Record<HubKind, number> = { place: 0, event: 1, occurrence: 2, offer: 3 };
type Producer = { id: string; credentialHash: string };
type Policy = { allow_persist: number; allow_display: number; allow_llm: number; required_credit: string | null };

function recordReasons(record: HubRecord, now: number): string[] {
  const reasons = new Set<string>();
  const fetched = Date.parse(record.fetchedAt), expires = Date.parse(record.expiresAt);
  if (fetched > now + 300_000 || expires <= fetched || expires <= now) reasons.add("FRESHNESS_INVALID");
  if (expires - fetched > (record.kind === "place" ? 7 : 1) * 86400_000) reasons.add("EXPIRY_TOO_LONG");
  const fields: string[] = [];
  const add = (field: string, value: unknown) => { if (value !== null && value !== "unknown" && (!Array.isArray(value) || value.length > 0 && value.some(item => item !== "und"))) fields.push(field); };
  if (record.kind === "place") {
    for (const field of ["name", "category", "address", "coordinates", "openingHours", "tags"] as const) add(field, record.facts[field]);
    const point = record.facts.coordinates;
    if (point) {
      const box = record.facts.cityId === "astana" ? [50.8, 51.5, 70.8, 72] : [42.8, 43.7, 76.4, 77.5];
      if (point.lat < box[0] || point.lat > box[1] || point.lon < box[2] || point.lon > box[3]) reasons.add("OUTSIDE_CITY");
      if (point.quality === "derived" && !point.methodId) reasons.add("COORDINATE_METHOD_REQUIRED");
      const fact = record.provenance.find(value => value.field === "coordinates");
      if (fact && (fact.quality !== point.quality || fact.sourceUrl !== point.sourceUrl
        || point.quality === "derived" && (fact.method !== "algorithm" || fact.methodId !== point.methodId)
        || point.quality === "observed" && fact.method !== "source")) reasons.add("COORDINATE_PROVENANCE_INVALID");
    }
  } else if (record.kind === "event") {
    for (const field of ["name", "category", "organizerUrl", "bookingUrl", "description"] as const) add(field, record.facts[field]);
  } else if (record.kind === "occurrence") {
    if (record.facts.startsAt === null) reasons.add("START_TIME_UNKNOWN");
    if (record.facts.startsAt && record.facts.endsAt && Date.parse(record.facts.endsAt) <= Date.parse(record.facts.startsAt)) reasons.add("INTERVAL_INVALID");
    for (const field of ["startsAt", "endsAt", "timeZone", "status", "languages", "availability"] as const) add(field, record.facts[field]);
  } else {
    const price = record.facts;
    if (price.priceKind === "unknown") {
      if (price.minMinor !== null || price.maxMinor !== null || price.currency !== null) reasons.add("UNKNOWN_PRICE_HAS_AMOUNT");
    } else {
      fields.push("price");
      if (price.minMinor === null || price.currency !== "KZT" || price.priceKind === "range" && (price.maxMinor === null || price.maxMinor < (price.minMinor ?? 0))
        || price.priceKind === "exact" && price.maxMinor !== price.minMinor || price.priceKind === "from" && price.maxMinor !== null) reasons.add("PRICE_INVALID");
    }
    if (price.validFrom && price.validUntil && Date.parse(price.validUntil) <= Date.parse(price.validFrom)) reasons.add("OFFER_INTERVAL_INVALID");
    for (const field of ["validFrom", "validUntil", "availability", "bookingUrl"] as const) add(field, price[field]);
  }
  const seen = new Set<string>();
  for (const fact of record.provenance) {
    if (seen.has(fact.field)) reasons.add("DUPLICATE_PROVENANCE_FIELD"); seen.add(fact.field);
    if (fact.method === "llm") reasons.add("LLM_FACT_REQUIRES_REVIEW");
    if (Date.parse(fact.fetchedAt) > now + 300_000 || Date.parse(fact.expiresAt) <= now || Date.parse(fact.expiresAt) <= Date.parse(fact.fetchedAt)
      || Date.parse(fact.expiresAt) < expires) reasons.add("PROVENANCE_FRESHNESS_INVALID");
  }
  for (const field of fields) {
    const fact = record.provenance.find(value => value.field === field);
    if (!fact) reasons.add(`PROVENANCE_REQUIRED:${field}`);
    else if (fact.quality === "unknown" || fact.quality === "conflicting") reasons.add(`FACT_UNVERIFIED:${field}`);
    else if (["name", "startsAt", "endsAt", "timeZone", "status", "languages", "availability", "price", "validFrom", "validUntil", "openingHours"].includes(field)
      && (fact.method !== "source" || fact.quality !== "observed")) reasons.add(`OBSERVED_FACT_REQUIRED:${field}`);
  }
  return [...reasons];
}

/** Trusted Node repository. No remote requests, URL resolution or source approval API. */
export function createDataHubRepository(db: DatabaseSync, clock: () => number = Date.now) {
  const checkedNow = () => { const now = clock(); if (!Number.isSafeInteger(now) || now < 0 || now > 8e12) throw new Error("HUB_CLOCK_INVALID"); return now; };
  function registerProducer(input: HubProducer) {
    sourceId.parse(input.id);
    if (!/^[a-f0-9]{64}$/u.test(input.tokenHash) || !input.sourceIds.length || input.sourceIds.length > 20
      || input.sourceIds.some(id => !sourceId.safeParse(id).success) || !input.cities.length
      || input.cities.some(city => !["astana", "almaty"].includes(city))) throw new Error("HUB_PRODUCER_INVALID");
    for (const source of input.sourceIds) if (!Array.isArray(input.sourceHosts[source]) || !input.sourceHosts[source].length || input.sourceHosts[source].length > 20
      || input.sourceHosts[source].some(host => !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u.test(host) || !publicUrl.safeParse(`https://${host}`).success)) throw new Error("HUB_SOURCE_HOSTS_REQUIRED");
    const minute = input.maxBatchesPerMinute ?? 10, day = input.maxRecordsPerDay ?? 1000, bytes = input.maxBytesPerDay ?? 5 * 1024 * 1024;
    if (!Number.isSafeInteger(minute) || minute < 1 || minute > 60 || !Number.isSafeInteger(day) || day < 1 || day > 10000
      || !Number.isSafeInteger(bytes) || bytes < 1024 || bytes > 50 * 1024 * 1024) throw new Error("HUB_PRODUCER_INVALID");
    db.prepare(`INSERT INTO qettyq_hub_producers VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      token_hash=excluded.token_hash,source_ids_json=excluded.source_ids_json,source_hosts_json=excluded.source_hosts_json,cities_json=excluded.cities_json,
      enabled=excluded.enabled,max_batches_minute=excluded.max_batches_minute,max_records_day=excluded.max_records_day,max_bytes_day=excluded.max_bytes_day`)
      .run(input.id, input.tokenHash, JSON.stringify(input.sourceIds), JSON.stringify(input.sourceHosts), JSON.stringify(input.cities), +input.enabled, minute, day, bytes);
  }
  function authenticate(token: string): Producer | null {
    if (!/^[A-Za-z0-9_-]{32,256}$/u.test(token)) return null;
    const row = db.prepare("SELECT * FROM qettyq_hub_producers WHERE token_hash=? AND enabled=1").get(hubHash(token));
    return row ? { id: String(row.id), credentialHash: hubHash(token) } : null;
  }
  function policy(id: string): Policy | undefined { return db.prepare("SELECT allow_persist,allow_display,allow_llm,required_credit FROM data_sources WHERE id=?").get(id) as Policy | undefined; }
  function reference(source: string, kind: HubKind, externalId: string, city: string) {
    const table = { place: "qettyq_hub_places", event: "qettyq_hub_events", occurrence: "qettyq_hub_occurrences", offer: "qettyq_hub_offers" }[kind];
    const id = hubEntityId(source, kind, externalId);
    return db.prepare(`SELECT id FROM ${table} WHERE id=? AND city_id=? AND expires_at>?`).get(id, city, new Date(checkedNow()).toISOString()) ? id : null;
  }
  function saveEntity(record: HubRecord) {
    const id = hubEntityId(record.sourceId, record.kind, record.externalId), facts = record.facts;
    const tail = [record.sourceUrl, iso(record.fetchedAt), iso(record.expiresAt)];
    if (record.kind === "place") {
      const value = record.facts, point = value.coordinates;
      db.prepare(`INSERT INTO qettyq_hub_places VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,category=excluded.category,address=excluded.address,lat=excluded.lat,lon=excluded.lon,
        coordinate_quality=excluded.coordinate_quality,opening_hours=excluded.opening_hours,tags_json=excluded.tags_json,
        source_url=excluded.source_url,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at`)
        .run(id, record.sourceId, record.externalId, value.cityId, value.name, value.category, value.address,
          point?.lat ?? null, point?.lon ?? null, point?.quality ?? "unknown", value.openingHours, JSON.stringify(value.tags), ...tail);
    } else if (record.kind === "event") {
      const value = record.facts;
      db.prepare(`INSERT INTO qettyq_hub_events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,category=excluded.category,venue_id=excluded.venue_id,organizer_url=excluded.organizer_url,
        booking_url=excluded.booking_url,description=excluded.description,source_url=excluded.source_url,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at`)
        .run(id, record.sourceId, record.externalId, value.cityId, value.name, value.category,
          value.venueExternalId ? reference(record.sourceId, "place", value.venueExternalId, value.cityId) : null, value.organizerUrl, value.bookingUrl, value.description, ...tail);
    } else if (record.kind === "occurrence") {
      const value = record.facts;
      db.prepare(`INSERT INTO qettyq_hub_occurrences VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
        event_id=excluded.event_id,venue_id=excluded.venue_id,starts_at=excluded.starts_at,ends_at=excluded.ends_at,status=excluded.status,
        languages_json=excluded.languages_json,availability=excluded.availability,source_url=excluded.source_url,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at`)
        .run(id, record.sourceId, record.externalId, value.cityId, reference(record.sourceId, "event", value.eventExternalId, value.cityId),
          value.venueExternalId ? reference(record.sourceId, "place", value.venueExternalId, value.cityId) : null,
          iso(value.startsAt!), value.endsAt ? iso(value.endsAt) : null, value.timeZone, value.status, JSON.stringify(value.languages), value.availability, ...tail);
    } else {
      const value = record.facts;
      db.prepare(`INSERT OR REPLACE INTO qettyq_hub_offers VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, record.sourceId, record.externalId, value.cityId, value.appliesTo.kind,
          hubEntityId(record.sourceId, value.appliesTo.kind, value.appliesTo.externalId), value.priceKind, value.minMinor, value.maxMinor,
          value.currency, value.basis, value.validFrom ? iso(value.validFrom) : null, value.validUntil ? iso(value.validUntil) : null, value.availability, value.bookingUrl, ...tail);
    }
    db.prepare("DELETE FROM qettyq_hub_provenance WHERE entity_id=?").run(id);
    for (const fact of record.provenance) db.prepare("INSERT INTO qettyq_hub_provenance VALUES(?,?,?,?,?,?,?,?)")
      .run(id, fact.field, fact.quality, fact.method, fact.methodId, fact.sourceUrl, iso(fact.fetchedAt), iso(fact.expiresAt));
    db.prepare("DELETE FROM qettyq_hub_media WHERE entity_id=?").run(id);
    for (const asset of record.media) {
      const grant = db.prepare("SELECT * FROM qettyq_hub_media_grants WHERE source_id=? AND asset_url=? AND expires_at_ms>?").get(record.sourceId, asset.url, checkedNow());
      db.prepare("INSERT INTO qettyq_hub_media VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run(id, asset.externalId, asset.url, asset.sourceUrl,
        asset.type, asset.author, grant?.license ?? asset.license, grant?.evidence_url ?? asset.evidenceUrl, grant?.credit ?? null,
        grant?.allow_display ?? 0, grant?.allow_download ?? 0, grant?.allow_llm ?? 0);
    }
    return { id, city: facts.cityId };
  }
  function ingest(producer: Producer, batchId: string, values: unknown[]): HubBatchResult {
    hubId.parse(batchId);
    const serialized = canonicalHubJson(values), byteCount = Buffer.byteLength(serialized);
    if (!values.length || values.length > DATA_HUB_MAX_RECORDS || byteCount > DATA_HUB_MAX_BYTES) throw new Error("HUB_PAYLOAD_TOO_LARGE");
    const now = checkedNow(), contentHash = hubHash(serialized);
    return atomic(db, () => {
      // Re-read revocation and scopes within the writer transaction.
      const current = db.prepare("SELECT * FROM qettyq_hub_producers WHERE id=? AND enabled=1").get(producer.id);
      if (!current || current.token_hash !== producer.credentialHash) throw new Error("HUB_UNAUTHORIZED");
      const sourceIds = JSON.parse(String(current.source_ids_json)) as string[], cities = JSON.parse(String(current.cities_json)) as string[];
      const hosts = JSON.parse(String(current.source_hosts_json)) as Record<string, string[]>;
      if (values.some(value => !value || typeof value !== "object" || !sourceIds.includes(String((value as Record<string, unknown>).sourceId)))) throw new Error("HUB_SOURCE_SCOPE_DENIED");
      const previous = db.prepare("SELECT content_hash,response_json FROM qettyq_hub_batches WHERE producer_id=? AND batch_id=?").get(producer.id, batchId);
      if (previous) {
        if (previous.content_hash !== contentHash) throw new Error("HUB_BATCH_CONFLICT");
        return { ...JSON.parse(String(previous.response_json)) as HubBatchResult, replay: true };
      }
      const minute = db.prepare("SELECT COUNT(*) AS count FROM qettyq_hub_batches WHERE producer_id=? AND received_at_ms>?").get(producer.id, now - 60_000);
      const midnight = Date.parse(`${new Date(now).toISOString().slice(0, 10)}T00:00:00Z`);
      const day = db.prepare("SELECT COALESCE(SUM(record_count),0) AS count FROM qettyq_hub_batches WHERE producer_id=? AND received_at_ms>=?").get(producer.id, midnight);
      const bytes = db.prepare("SELECT COALESCE(SUM(byte_count),0) AS count FROM qettyq_hub_batches WHERE producer_id=? AND received_at_ms>=?").get(producer.id, midnight);
      const global = db.prepare("SELECT COUNT(*) AS batches,COALESCE(SUM(record_count),0) AS records,COALESCE(SUM(byte_count),0) AS bytes FROM qettyq_hub_batches WHERE received_at_ms>=?").get(midnight);
      const globalMinute = db.prepare("SELECT COUNT(*) AS count FROM qettyq_hub_batches WHERE received_at_ms>?").get(now - 60_000);
      if (Number(minute?.count) >= Number(current.max_batches_minute) || Number(day?.count) + values.length > Number(current.max_records_day)
        || Number(bytes?.count) + byteCount > Number(current.max_bytes_day) || Number(globalMinute?.count) >= 60
        || Number(global?.records) + values.length > 10000 || Number(global?.bytes) + byteCount > 50 * 1024 * 1024) throw new Error("HUB_RATE_LIMITED");
      // Hard metadata ceiling, independent of retention/cron working correctly.
      if (Number(db.prepare("SELECT COUNT(*) AS count FROM qettyq_hub_records").get()?.count) + values.length > 100000) throw new Error("HUB_CAPACITY_REACHED");
      const outcomes: HubRecordResult[] = [];
      const ordered = values.map((raw, index) => ({ raw, index, parsed: hubRecordSchema.safeParse(raw) }))
        .sort((a, b) => (a.parsed.success ? rank[a.parsed.data.kind] : 9) - (b.parsed.success ? rank[b.parsed.data.kind] : 9));
      for (const entry of ordered) {
        const raw = entry.raw as Record<string, unknown>, record = entry.parsed.success ? entry.parsed.data : null;
        const source = String(raw.sourceId), digest = hubHash(canonicalHubJson(entry.raw));
        const external = hubId.safeParse(raw.externalId).success ? String(raw.externalId) : null;
        const kind = ["place", "event", "occurrence", "offer"].includes(String(raw.kind)) ? raw.kind as HubKind : null;
        const revision = Number.isSafeInteger(raw.revision) && Number(raw.revision) > 0 ? Number(raw.revision) : null;
        const reviewUrl = publicUrl.safeParse(raw.sourceUrl).success && hosts[source]?.includes(new URL(String(raw.sourceUrl)).hostname) ? String(raw.sourceUrl) : null;
        const recordId = `hub-record:${hubHash(`${source}:${kind}:${external}:${revision}:${digest}`)}`;
        const result: HubRecordResult = { recordId, externalId: external, kind, revision, status: "quarantined", reasons: [] };
        const prior = external && kind && revision ? db.prepare("SELECT content_hash,state,reasons_json,id FROM qettyq_hub_records WHERE source_id=? AND kind=? AND external_id=? AND revision=? ORDER BY received_at_ms LIMIT 1").get(source, kind, external, revision) : null;
        if (prior?.content_hash === digest) { result.status = "duplicate"; result.recordId = String(prior.id); result.reasons = [prior.state === "accepted" ? "ALREADY_ACCEPTED" : "ALREADY_QUARANTINED"]; outcomes[entry.index] = result; continue; }
        const rights = policy(source);
        const reasons = !record ? ["SCHEMA_INVALID"] : recordReasons(record, now);
        if (prior) reasons.push("REVISION_CONFLICT");
        if (!rights || rights.allow_persist !== 1) reasons.push("SOURCE_PERSIST_NOT_APPROVED");
        if (!rights || rights.allow_display !== 1) reasons.push("SOURCE_DISPLAY_NOT_APPROVED");
        if (record) {
          const sourceUrls = [record.sourceUrl, ...record.provenance.map(fact => fact.sourceUrl), ...record.media.map(asset => asset.sourceUrl),
            ...(record.kind === "place" && record.facts.coordinates ? [record.facts.coordinates.sourceUrl] : [])];
          if (sourceUrls.some(url => !hosts[source]?.includes(new URL(url).hostname))) reasons.push("SOURCE_HOST_NOT_APPROVED");
          if (!cities.includes(record.facts.cityId)) reasons.push("CITY_SCOPE_DENIED");
          const head = db.prepare("SELECT revision,fetched_at FROM qettyq_hub_heads WHERE source_id=? AND kind=? AND external_id=?").get(source, record.kind, record.externalId);
          if (head && (record.revision <= Number(head.revision) || Date.parse(record.fetchedAt) < Date.parse(String(head.fetched_at)))) reasons.push("STALE_REVISION");
          if ((record.kind === "event" || record.kind === "occurrence") && record.facts.venueExternalId && !reference(source, "place", record.facts.venueExternalId, record.facts.cityId)) reasons.push("VENUE_REFERENCE_UNRESOLVED");
          if (record.kind === "occurrence" && !reference(source, "event", record.facts.eventExternalId, record.facts.cityId)) reasons.push("EVENT_REFERENCE_UNRESOLVED");
          if (record.kind === "offer" && !reference(source, record.facts.appliesTo.kind, record.facts.appliesTo.externalId, record.facts.cityId)) reasons.push("OFFER_TARGET_UNRESOLVED");
        }
        result.reasons = [...new Set(reasons)];
        result.status = result.reasons.length ? "quarantined" : "accepted";
        // A quarantine is not permission to archive unknown-rights Threads content.
        const persistable = record && rights?.allow_persist === 1 ? JSON.stringify(normalizedRecord(record)) : null;
        db.prepare("INSERT OR IGNORE INTO qettyq_hub_records VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(recordId, producer.id, source,
          external, kind, revision, reviewUrl, digest, now, now + 7 * 86400_000, result.status, JSON.stringify(result.reasons), persistable);
        if (record && result.status === "accepted") {
          saveEntity(record);
          db.prepare("INSERT OR REPLACE INTO qettyq_hub_heads VALUES(?,?,?,?,?,?)").run(source, record.kind, record.externalId, record.revision, recordId, iso(record.fetchedAt));
        }
        outcomes[entry.index] = result;
      }
      const result: HubBatchResult = { schemaVersion: 1, batchId, replay: false, accepted: outcomes.filter(item => item.status === "accepted").length,
        quarantined: outcomes.filter(item => item.status === "quarantined").length, duplicate: outcomes.filter(item => item.status === "duplicate").length, records: outcomes };
      db.prepare("INSERT INTO qettyq_hub_batches VALUES(?,?,?,?,?,?,?)").run(producer.id, batchId, contentHash, now, values.length, byteCount, JSON.stringify(result));
      return result;
    });
  }
  function registerMediaGrant(grant: { sourceId: string; assetUrl: string; license: string; evidenceUrl: string; credit: string;
    allowDisplay: boolean; allowDownload: boolean; allowLlm: boolean; expiresAtMs: number }) {
    sourceId.parse(grant.sourceId); publicUrl.parse(grant.assetUrl); publicUrl.parse(grant.evidenceUrl);
    if (!grant.license.trim() || grant.license.length > 120 || !grant.credit.trim() || grant.credit.length > 300
      || !Number.isSafeInteger(grant.expiresAtMs) || grant.expiresAtMs <= checkedNow()) throw new Error("HUB_MEDIA_GRANT_INVALID");
    db.prepare("INSERT OR REPLACE INTO qettyq_hub_media_grants VALUES(?,?,?,?,?,?,?,?,?)").run(grant.sourceId, grant.assetUrl, grant.license,
      grant.evidenceUrl, grant.credit, +grant.allowDisplay, +grant.allowDownload, +grant.allowLlm, grant.expiresAtMs);
  }
  function listAccepted(options: { kind: HubKind; cityId: "astana" | "almaty"; forLlm?: boolean; limit?: number; now?: number; sourceId?: string; externalId?: string }) {
    const now = options.now ?? checkedNow();
    if (!Number.isSafeInteger(now) || now < 0 || now > 8e12) throw new Error("HUB_CLOCK_INVALID");
    const nowIso = new Date(now).toISOString(), limit = Math.min(100, Math.max(1, Math.floor(options.limit ?? 50)));
    const rows = db.prepare(`SELECT r.payload_json,h.revision,s.required_credit,s.allow_llm FROM qettyq_hub_heads h
      JOIN qettyq_hub_records r ON r.id=h.record_id JOIN data_sources s ON s.id=h.source_id
      WHERE h.kind=? AND r.state='accepted' AND r.payload_json IS NOT NULL AND s.allow_persist=1 AND s.allow_display=1
      AND (?=0 OR s.allow_llm=1) AND (?='' OR h.source_id=?) AND (?='' OR h.external_id=?)
      AND json_extract(r.payload_json,'$.facts.cityId')=? AND json_extract(r.payload_json,'$.expiresAt')>?
      ORDER BY json_extract(r.payload_json,'$.facts.startsAt'),h.source_id,h.external_id LIMIT 1000`)
      .all(options.kind, +Boolean(options.forLlm), options.sourceId ?? "", options.sourceId ?? "", options.externalId ?? "", options.externalId ?? "", options.cityId, nowIso);
    return rows.flatMap(row => {
      const record = JSON.parse(String(row.payload_json)) as HubRecord;
      if (record.facts.cityId !== options.cityId || iso(record.fetchedAt) > nowIso || iso(record.expiresAt) <= nowIso
        || record.kind === "occurrence" && (record.facts.status !== "scheduled" || !record.facts.startsAt || iso(record.facts.startsAt) < nowIso)
        || record.kind === "offer" && (record.facts.validFrom && iso(record.facts.validFrom) > nowIso || record.facts.validUntil && iso(record.facts.validUntil) <= nowIso)) return [];
      const id = hubEntityId(record.sourceId, record.kind, record.externalId);
      const media = db.prepare(`SELECT m.*,g.license AS granted_license,g.evidence_url AS granted_evidence,g.credit AS granted_credit
        FROM qettyq_hub_media m JOIN qettyq_hub_media_grants g ON g.source_id=? AND g.asset_url=m.asset_url
        WHERE m.entity_id=? AND g.allow_display=1 AND g.expires_at_ms>? AND (?=0 OR g.allow_llm=1)`).all(record.sourceId, id, now, +Boolean(options.forLlm));
      return [{ ...record, media: media.map(asset => ({ externalId: String(asset.external_id), url: String(asset.asset_url), sourceUrl: String(asset.source_url),
        type: String(asset.media_type), author: asset.author, license: asset.granted_license, evidenceUrl: asset.granted_evidence, credit: asset.granted_credit })),
        id, requiredCredit: row.required_credit, allowLlm: row.allow_llm === 1 }];
    }).slice(0, limit);
  }
  function purgeExpired() {
    const now = checkedNow();
    // Strip retained normalized/quarantine bodies after seven days. Keep minimal
    // hashes/revision heads for dedup; no original post body was accepted at all.
    return atomic(db, () => {
      const stripped = Number(db.prepare("UPDATE qettyq_hub_records SET payload_json=NULL WHERE expires_at_ms<=? AND payload_json IS NOT NULL").run(now).changes);
      db.prepare("DELETE FROM qettyq_hub_records WHERE expires_at_ms<=? AND id NOT IN(SELECT record_id FROM qettyq_hub_heads)").run(now);
      db.prepare("DELETE FROM qettyq_hub_batches WHERE received_at_ms<?").run(now - 30 * 86400_000);
      return stripped;
    });
  }
  function listQuarantined(limit = 50) {
    const bounded = Number.isSafeInteger(limit) ? Math.min(100, Math.max(1, limit)) : 50;
    return db.prepare(`SELECT id,producer_id,source_id,external_id,kind,revision,source_url,received_at_ms,expires_at_ms,reasons_json
      FROM qettyq_hub_records WHERE state='quarantined' AND expires_at_ms>? ORDER BY received_at_ms DESC,id LIMIT ?`).all(checkedNow(), bounded)
      .map(row => ({ recordId: row.id, producerId: row.producer_id, sourceId: row.source_id, externalId: row.external_id, kind: row.kind,
        revision: row.revision, sourceUrl: row.source_url, receivedAtMs: row.received_at_ms, expiresAtMs: row.expires_at_ms,
        reasons: JSON.parse(String(row.reasons_json)) as string[] }));
  }
  return { registerProducer, authenticate, ingest, registerMediaGrant, listAccepted, readAcceptedRows: listAccepted, listQuarantined, purgeExpired };
}
export type DataHubRepository = ReturnType<typeof createDataHubRepository>;
