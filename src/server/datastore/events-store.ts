import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Place } from "../../domain/types";
import type { PilotContext } from "../pilot/contracts";
import { retrieveEventEvidence } from "../ingestion/event-evidence";
import type { LiveEventsResult } from "../ingestion/live-events";
import type { LiveAstanaEvent, SxodimSnapshot } from "../ingestion/sxodim-live";
import { atomic } from "./sqlite";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const iso = (value: string) => { if (!Number.isFinite(Date.parse(value))) throw new Error("INVALID_TIMESTAMP"); return new Date(value).toISOString(); };
const sourceUrl = (value: string) => { const url = new URL(value); if (url.protocol !== "https:" || url.username || url.password) throw new Error("INVALID_SOURCE_URL"); return url.href; };
const checkedClock = (value: number) => { if (!Number.isSafeInteger(value) || value < 0 || value > 8_000_000_000_000) throw new Error("INVALID_CLOCK"); return new Date(value).toISOString(); };
export type DatastoreSourcePolicy = { id: string; name: string; policyUrl: string; allowPersist: boolean; allowDisplay: boolean; allowLlm: boolean; allowFetch?: boolean; credit: string | null; minimumRefreshMinutes: number };
export type OpeningHoursFact = { id: string; venueId: string; sourceId: string; weekday: number; state: "open" | "closed" | "unknown"; opensMinute: number | null; closesMinute: number | null; completeDay: boolean; sourceUrl: string; fetchedAt: string; expiresAt: string };
export type NearFilter = { lat: number; lon: number; radiusKm: number };

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dlat = radians(b.lat - a.lat), dlon = radians(b.lon - a.lon);
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin(dlat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dlon / 2) ** 2)));
}
function checkedNear(near?: NearFilter) {
  if (near && (!Number.isFinite(near.lat) || Math.abs(near.lat) > 90 || !Number.isFinite(near.lon) || Math.abs(near.lon) > 180 || !Number.isFinite(near.radiusKm) || near.radiusKm <= 0 || near.radiusKm > 100)) throw new Error("INVALID_NEAR_FILTER");
}

/** Local durable repository; never fetches, geocodes, invents opening hours, or runs AI. */
export function createEventsStore(db: DatabaseSync) {
  function registerSource(source: DatastoreSourcePolicy) {
    if (!source.id || !source.name || !Number.isSafeInteger(source.minimumRefreshMinutes) || source.minimumRefreshMinutes < 0) throw new Error("INVALID_SOURCE_POLICY");
    db.prepare(`INSERT INTO data_sources VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,policy_url=excluded.policy_url,allow_persist=excluded.allow_persist,allow_display=excluded.allow_display,
      allow_llm=excluded.allow_llm,allow_fetch=excluded.allow_fetch,required_credit=excluded.required_credit,minimum_refresh_minutes=excluded.minimum_refresh_minutes`)
      .run(source.id, source.name, sourceUrl(source.policyUrl), +source.allowPersist, +source.allowDisplay, +source.allowLlm, +Boolean(source.allowFetch), source.credit, source.minimumRefreshMinutes);
  }
  function policy(id: string) {
    const row = db.prepare("SELECT * FROM data_sources WHERE id=?").get(id);
    if (!row || row.allow_persist !== 1) throw new Error("SOURCE_PERSIST_PERMISSION_REQUIRED");
    return row;
  }
  function acquireSourceRefresh(sourceId: string, now = Date.now()) {
    checkedClock(now);
    const source = policy(sourceId);
    if (source.allow_fetch !== 1) throw new Error("SOURCE_FETCH_PERMISSION_REQUIRED");
    const interval = Number(source.minimum_refresh_minutes) * 60_000;
    if (!Number.isSafeInteger(interval) || interval < 60_000) throw new Error("SOURCE_REFRESH_POLICY_REQUIRED");
    // Reserve BEFORE any network request. Failed attempts do not reset the source cooldown.
    return Number(db.prepare(`INSERT INTO source_refresh_leases VALUES(?,?,?) ON CONFLICT(source_id) DO UPDATE
      SET attempted_at_ms=excluded.attempted_at_ms,next_allowed_ms=excluded.next_allowed_ms
      WHERE source_refresh_leases.next_allowed_ms<=excluded.attempted_at_ms`).run(sourceId, now, now + interval).changes) === 1;
  }
  function provenance(kind: string, id: string, field: string, quality: "observed" | "estimated" | "unknown" | "conflicting", url: string, fetched: string, expires: string, contentHash: string | null, parser: string) {
    db.prepare("INSERT OR REPLACE INTO fact_provenance VALUES(?,?,?,?,?,?,?,?,?)")
      .run(kind, id, field, quality, sourceUrl(url), fetched, expires, contentHash, parser);
  }
  function importSxodim(snapshot: SxodimSnapshot) {
    const sourceId = "sxodim-astana-noncommercial";
    policy(sourceId);
    const fetched = iso(snapshot.fetchedAt), expires = iso(snapshot.expiresAt);
    if (snapshot.source.id !== sourceId || snapshot.source.reuse !== "noncommercial_with_credit" || snapshot.source.mediaCopied !== false || expires <= fetched || snapshot.items.length > 50) throw new Error("INVALID_SXODIM_SNAPSHOT");
    const payload = JSON.stringify(snapshot), digest = hash(payload);
    return atomic(db, () => {
      const previous = db.prepare("SELECT fetched_at,content_hash FROM source_records WHERE source_id=?").get(sourceId);
      if (previous && String(previous.fetched_at) > fetched) return { imported: 0, skipped: "older_snapshot" as const };
      if (previous?.content_hash === digest) return { imported: 0, skipped: "unchanged" as const };
      for (const event of snapshot.items) {
        if (event.cityId !== "astana" || event.timeZone !== "Asia/Almaty" || event.provenance.sourceId !== sourceId
          || !event.id.startsWith("sxodim:") || event.name.length === 0 || event.name.length > 500
          || new URL(sourceUrl(event.provenance.sourceUrl)).hostname !== "sxodim.com"
          || event.availability !== "unknown" || !["scheduled", "unknown"].includes(event.status)
          || !["ru", "kk", "en", "und"].includes(event.contentLanguage) || event.image !== null
          || event.requiredCredit.text !== "Давай Сходим" || new URL(sourceUrl(event.requiredCredit.url)).hostname !== "sxodim.com") throw new Error("INVALID_SOURCE_EVENT");
        const starts = iso(event.startsAt), ends = event.endsAt ? iso(event.endsAt) : null;
        if (ends && ends <= starts) throw new Error("INVALID_EVENT_INTERVAL");
        if (!["unknown", "exact", "from"].includes(event.price.kind) || event.price.basis !== "unknown"
          || event.price.kind === "unknown" && (event.price.minMinor !== null || event.price.currency !== null)
          || event.price.kind !== "unknown" && (!Number.isSafeInteger(event.price.minMinor) || event.price.minMinor! < 0 || event.price.currency !== "KZT")
          || event.durationMinutes !== null && (!Number.isSafeInteger(event.durationMinutes) || event.durationMinutes <= 0)) throw new Error("INVALID_EVENT_PRICE");
        if ((event.lat === null) !== (event.lon === null) || event.lat !== null && (!Number.isFinite(event.lat) || Math.abs(event.lat) > 90 || !Number.isFinite(event.lon) || Math.abs(event.lon!) > 180)) throw new Error("INVALID_EVENT_COORDINATES");
        const venueId = event.venueName || event.address ? `${sourceId}:venue:${hash(`${event.venueName ?? ""}|${event.address ?? ""}`).slice(0, 24)}` : null;
        if (venueId) db.prepare(`INSERT INTO venues(id,source_id,external_id,city_id,name,address,lat,lon,fetched_at,expires_at,source_url)
          VALUES(?,?,?,'astana',?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,address=excluded.address,lat=excluded.lat,lon=excluded.lon,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at`)
          .run(venueId, sourceId, venueId, event.venueName ?? event.address!, event.address, event.lat, event.lon, fetched, expires, event.provenance.sourceUrl);
        // Merge only the observed provider identity, never a fuzzy title or guessed recurrence.
        const externalId = /^sxodim:(\d+):/u.exec(event.id)?.[1];
        if (!externalId) throw new Error("INVALID_EVENT_IDENTITY");
        const eventId = `${sourceId}:event:${externalId}`;
        db.prepare(`INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,
          venue_id=excluded.venue_id,source_url=excluded.source_url,booking_url=excluded.booking_url,organizer_url=excluded.organizer_url`)
          .run(eventId, sourceId, externalId, event.name, event.category, venueId, event.provenance.sourceUrl, event.bookingUrl ? sourceUrl(event.bookingUrl) : null, event.organizerUrl ? sourceUrl(event.organizerUrl) : null);
        db.prepare(`INSERT INTO event_occurrences VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          starts_at=excluded.starts_at,ends_at=excluded.ends_at,status=excluded.status,content_languages_json=excluded.content_languages_json,
          price_kind=excluded.price_kind,price_min_minor=excluded.price_min_minor,price_max_minor=excluded.price_max_minor,currency=excluded.currency,
          fetched_at=excluded.fetched_at,expires_at=excluded.expires_at,payload_json=excluded.payload_json`)
          .run(event.id, eventId, "astana", starts, ends, "Asia/Almaty", event.status, JSON.stringify(event.contentLanguage === "und" ? [] : [event.contentLanguage]),
            event.price.kind, event.price.minMinor, event.price.kind === "exact" ? event.price.minMinor : null, event.price.currency, "unknown", "unknown", fetched, expires, "snapshot", JSON.stringify(event));
        for (const [field, quality] of [["name", "observed"], ["address", event.address === null ? "unknown" : "observed"], ["startsAt", event.provenance.scheduleQuality], ["price", event.provenance.priceQuality], ["language", event.contentLanguage === "und" ? "unknown" : "observed"], ["coordinates", event.lat === null ? "unknown" : "observed"]] as const)
          provenance("occurrence", event.id, field, quality, event.provenance.sourceUrl, fetched, expires, digest, event.provenance.parserVersion);
        // Source adapter intentionally imports no photos. A URL is not a media license.
      }
      db.prepare("INSERT OR REPLACE INTO source_records VALUES(?,?,?,?,?)").run(sourceId, digest, fetched, expires, payload);
      db.prepare("INSERT INTO ingestion_runs(source_id,started_at,finished_at,imported_count,content_hash) VALUES(?,?,?,?,?)").run(sourceId, fetched, new Date().toISOString(), snapshot.items.length, digest);
      return { imported: snapshot.items.length, skipped: null };
    });
  }
  function importPlaces(places: Place[], options: { sourceId: string; expiresAt: string }) {
    policy(options.sourceId);
    const expires = iso(options.expiresAt);
    return atomic(db, () => {
      for (const place of places) {
        const fetched = iso(place.retrievedAt);
        if (expires <= fetched || !Number.isFinite(place.lat) || Math.abs(place.lat) > 90 || !Number.isFinite(place.lon) || Math.abs(place.lon) > 180 || place.dataMode !== "snapshot"
          || place.price !== null && (!Number.isSafeInteger(place.price.min * 100) || !Number.isSafeInteger(place.price.max * 100) || place.price.min < 0 || place.price.max < place.price.min)
          || !Number.isSafeInteger(place.durationMinutes) || place.durationMinutes <= 0) throw new Error("INVALID_PLACE");
        const previous = db.prepare("SELECT fetched_at FROM venues WHERE id=?").get(place.id);
        if (previous && String(previous.fetched_at) > fetched) continue;
        db.prepare(`INSERT INTO venues(id,source_id,external_id,city_id,name,category,address,lat,lon,tags_json,fetched_at,expires_at,source_url,price_min_minor,price_max_minor,duration_estimate_minutes)
          VALUES(?,?,?,'astana',?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,address=excluded.address,
          lat=excluded.lat,lon=excluded.lon,tags_json=excluded.tags_json,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at,
          price_min_minor=excluded.price_min_minor,price_max_minor=excluded.price_max_minor,duration_estimate_minutes=excluded.duration_estimate_minutes`)
          .run(place.id, options.sourceId, place.id, place.name, place.category, place.address, place.lat, place.lon, JSON.stringify(place.tags), fetched, expires, sourceUrl(place.sourceUrl), place.price ? place.price.min * 100 : null, place.price ? place.price.max * 100 : null, place.durationMinutes);
        provenance("venue", place.id, "coordinates", "observed", place.sourceUrl, fetched, expires, null, "osm-snapshot-v1");
        provenance("venue", place.id, "duration", "estimated", place.sourceUrl, fetched, expires, null, "osm-snapshot-v1");
        provenance("venue", place.id, "openingHours", "unknown", place.sourceUrl, fetched, expires, null, "osm-snapshot-v1");
      }
      return { imported: places.length };
    });
  }
  function readSnapshot(): SxodimSnapshot | null {
    const row = db.prepare("SELECT r.payload_json FROM source_records r JOIN data_sources s ON s.id=r.source_id WHERE r.source_id=? AND s.allow_display=1").get("sxodim-astana-noncommercial");
    return row ? JSON.parse(String(row.payload_json)) as SxodimSnapshot : null;
  }
  function retrieve(options: { text: string; context: PilotContext; now?: number; allowStale?: boolean; near?: NearFilter; forLlm?: boolean }) {
    const now = options.now ?? Date.now(), nowIso = checkedClock(now);
    checkedNear(options.near);
    const snapshot = readSnapshot();
    const rows = db.prepare(`SELECT o.payload_json,o.expires_at FROM event_occurrences o JOIN events e ON e.id=o.event_id JOIN data_sources s ON s.id=e.source_id
      WHERE o.city_id='astana' AND o.starts_at>=? AND o.status='scheduled' AND s.allow_display=1 AND (?=0 OR s.allow_llm=1)
      AND o.fetched_at<=? AND (?=1 OR o.expires_at>?) ORDER BY o.starts_at LIMIT 500`).all(nowIso, +Boolean(options.forLlm), nowIso, +Boolean(options.allowStale), nowIso);
    const events = rows.map(row => JSON.parse(String(row.payload_json)) as LiveAstanaEvent).filter(event => !options.near || event.lat !== null && event.lon !== null && distanceKm(options.near, { lat: event.lat, lon: event.lon }) <= options.near.radiusKm);
    const fresh = snapshot !== null && Date.parse(snapshot.fetchedAt) <= now && Date.parse(snapshot.expiresAt) > now && rows.every(row => Date.parse(String(row.expires_at)) > now);
    const data: LiveEventsResult = { dataMode: snapshot ? "snapshot" : "unavailable", freshness: snapshot ? fresh ? "fresh" : "stale" : "unavailable", cacheStatus: snapshot ? "hit" : "miss",
      fetchedAt: snapshot?.fetchedAt ?? null, expiresAt: snapshot?.expiresAt ?? null, source: snapshot?.source ?? null, coverage: snapshot?.coverage ?? null, items: events,
      warnings: ["Сохранённые данные; наличие мест уточните у организатора.", ...(!fresh ? ["Срок актуальности снимка истёк; это не подтверждение расписания."] : [])] };
    return { ...retrieveEventEvidence(data, options.text, options.context, now), meta: { dataMode: data.dataMode, freshness: data.freshness, coverage: data.coverage, warnings: data.warnings, distanceQuality: "straight_line" as const, routeChecked: false as const } };
  }
  function saveOpeningHours(facts: OpeningHoursFact[]) {
    atomic(db, () => { for (const fact of facts) {
      if (!db.prepare("SELECT 1 FROM venues WHERE id=?").get(fact.venueId)) throw new Error("VENUE_NOT_FOUND");
      // An official museum fact needs its own approved source, not the venue's OSM permission.
      policy(fact.sourceId);
      const fetched = iso(fact.fetchedAt), expires = iso(fact.expiresAt);
      if (expires <= fetched) throw new Error("INVALID_FACT_EXPIRY");
      if (!Number.isSafeInteger(fact.weekday) || fact.weekday < 0 || fact.weekday > 6
        || fact.opensMinute !== null && !Number.isSafeInteger(fact.opensMinute) || fact.closesMinute !== null && !Number.isSafeInteger(fact.closesMinute)) throw new Error("INVALID_HOURS");
      db.prepare("INSERT OR REPLACE INTO venue_opening_hours VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(fact.id, fact.venueId, fact.sourceId, fact.weekday, fact.state, fact.opensMinute, fact.closesMinute, +fact.completeDay, sourceUrl(fact.sourceUrl), fetched, expires);
    } });
  }
  function openingStatus(venueId: string, fromMs: number, untilMs: number): "open" | "closed" | "unknown" {
    checkedClock(fromMs); checkedClock(untilMs);
    if (untilMs <= fromMs) return "unknown";
    const local = (time: number) => new Date(time + 5 * 3600_000);
    const start = local(fromMs), end = local(untilMs);
    if (start.toISOString().slice(0, 10) !== end.toISOString().slice(0, 10)) return "unknown";
    const rows = db.prepare(`SELECT h.* FROM venue_opening_hours h JOIN data_sources s ON s.id=h.source_id
      WHERE h.venue_id=? AND h.weekday=? AND h.fetched_at<=? AND h.expires_at>? AND s.allow_display=1`)
      .all(venueId, start.getUTCDay(), new Date(fromMs).toISOString(), new Date(untilMs).toISOString());
    if (!rows.length || rows.some(row => row.state === "unknown")) return "unknown";
    const minute = (date: Date) => date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60 + date.getUTCMilliseconds() / 60_000;
    const covering = rows.some(row => row.state === "open" && Number(row.opens_minute) <= minute(start) && Number(row.closes_minute) >= minute(end));
    const closed = rows.some(row => row.state === "closed");
    if (covering) return closed ? "unknown" : "open";
    const overlap = rows.some(row => row.state === "open" && Number(row.opens_minute) < minute(end) && Number(row.closes_minute) > minute(start));
    return closed && !overlap || !overlap && rows.every(row => row.complete_day === 1) ? "closed" : "unknown";
  }
  function retrievePlaces(options: { context: PilotContext; query?: string; now?: number; visitStartMs?: number; near?: NearFilter; requireOpen?: boolean; limit?: number }) {
    const now = options.now ?? Date.now(), stamp = checkedClock(now);
    const visitStart = options.visitStartMs ?? now;
    checkedClock(visitStart);
    checkedNear(options.near);
    const query = (options.query ?? "").normalize("NFKC").toLocaleLowerCase("ru-RU");
    const context = options.context;
    const wanted = context.goal === "food" ? ["food", "cafe", "restaurant", "fast_food"] : context.goal === "walk" ? ["park", "garden", "viewpoint"] : [];
    return db.prepare(`SELECT v.*,s.required_credit,s.policy_url FROM venues v JOIN data_sources s ON s.id=v.source_id
      WHERE s.allow_display=1 AND v.fetched_at<=? AND v.expires_at>? AND v.category IS NOT NULL`).all(stamp, stamp).flatMap(row => {
      const tags = JSON.parse(String(row.tags_json)) as string[];
      const name = String(row.name);
      if (query && !`${name} ${row.category} ${row.address ?? ""} ${tags.join(" ")}`.toLocaleLowerCase("ru-RU").includes(query)) return [];
      if (wanted.length && !tags.some(tag => wanted.includes(tag))) return [];
      if (context.goal === "new" && context.likedTags.length && !tags.some(tag => context.likedTags.includes(tag))) return [];
      const near = options.near;
      const distance = near && row.lat !== null && row.lon !== null ? distanceKm(near, { lat: Number(row.lat), lon: Number(row.lon) }) : null;
      if (near && (distance === null || distance > near.radiusKm)) return [];
      const multiplier = context.budgetBasis === "group" ? context.partySize : 1;
      const priceMin = row.price_min_minor === null ? null : Number(row.price_min_minor) / 100;
      const priceMax = row.price_max_minor === null ? null : Number(row.price_max_minor) / 100;
      if (context.budget !== null && (priceMin === null || priceMax === null ? context.strictBudget : (context.strictBudget ? priceMax : priceMin) * multiplier > context.budget)) return [];
      const duration = row.duration_estimate_minutes === null ? null : Number(row.duration_estimate_minutes);
      if (duration !== null && duration > context.minutes) return [];
      const opening = openingStatus(String(row.id), visitStart, visitStart + (duration ?? context.minutes) * 60_000);
      if (opening === "closed" || options.requireOpen && opening !== "open") return [];
      return [{ id: String(row.id), name, category: String(row.category), address: row.address === null ? null : String(row.address),
        lat: row.lat === null ? null : Number(row.lat), lon: row.lon === null ? null : Number(row.lon), tags,
        price: priceMin === null || priceMax === null ? null : { min: priceMin, max: priceMax },
        durationMinutes: duration, durationQuality: "estimated" as const,
        distanceKm: distance, distanceQuality: distance === null ? "unavailable" as const : "straight_line" as const,
        travelMinutes: null, feasibility: "uncertain" as const, openingStatus: opening,
        unknowns: [...(opening === "unknown" ? ["OPENING_HOURS_UNKNOWN"] : []), ...(priceMin === null ? ["PRICE_UNKNOWN"] : []), "ROUTE_NOT_CHECKED"],
        sourceUrl: String(row.source_url), fetchedAt: String(row.fetched_at), expiresAt: String(row.expires_at),
        requiredCredit: row.required_credit === null ? null : { text: String(row.required_credit), url: String(row.policy_url) } }];
    }).sort((a, b) => b.tags.filter(tag => context.likedTags.includes(tag)).length - a.tags.filter(tag => context.likedTags.includes(tag)).length
      || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.id.localeCompare(b.id))
      .slice(0, Math.max(1, Math.min(50, options.limit ?? 10)));
  }
  return { registerSource, acquireSourceRefresh, importSxodim, importPlaces, readSnapshot, retrieve, retrievePlaces, saveOpeningHours, openingStatus,
    snapshotCache: { async read() { return readSnapshot(); }, async write(snapshot: SxodimSnapshot) { importSxodim(snapshot); } } };
}
