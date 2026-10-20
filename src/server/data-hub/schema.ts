/** Install only during root-controlled Node/SQLite startup, never per request. */
export const DATA_HUB_SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS qettyq_hub_producers(
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE CHECK(length(token_hash)=64),
 source_ids_json TEXT NOT NULL, source_hosts_json TEXT NOT NULL, cities_json TEXT NOT NULL, enabled INTEGER NOT NULL CHECK(enabled IN(0,1)),
 max_batches_minute INTEGER NOT NULL CHECK(max_batches_minute BETWEEN 1 AND 60),
 max_records_day INTEGER NOT NULL CHECK(max_records_day BETWEEN 1 AND 10000),
 max_bytes_day INTEGER NOT NULL CHECK(max_bytes_day BETWEEN 1024 AND 52428800)
);
CREATE TABLE IF NOT EXISTS qettyq_hub_batches(
 producer_id TEXT NOT NULL REFERENCES qettyq_hub_producers(id), batch_id TEXT NOT NULL,
 content_hash TEXT NOT NULL, received_at_ms INTEGER NOT NULL, record_count INTEGER NOT NULL, byte_count INTEGER NOT NULL,
 response_json TEXT NOT NULL, PRIMARY KEY(producer_id,batch_id)
);
CREATE INDEX IF NOT EXISTS hub_batches_rate ON qettyq_hub_batches(producer_id,received_at_ms);
CREATE TABLE IF NOT EXISTS qettyq_hub_records(
 id TEXT PRIMARY KEY, producer_id TEXT NOT NULL REFERENCES qettyq_hub_producers(id),
 source_id TEXT NOT NULL, external_id TEXT, kind TEXT, revision INTEGER, source_url TEXT,
 content_hash TEXT NOT NULL, received_at_ms INTEGER NOT NULL, expires_at_ms INTEGER NOT NULL,
 state TEXT NOT NULL CHECK(state IN('accepted','quarantined')), reasons_json TEXT NOT NULL,
 payload_json TEXT
);
CREATE INDEX IF NOT EXISTS hub_records_identity ON qettyq_hub_records(source_id,kind,external_id,revision);
CREATE INDEX IF NOT EXISTS hub_records_expiry ON qettyq_hub_records(expires_at_ms);
CREATE TABLE IF NOT EXISTS qettyq_hub_heads(
 source_id TEXT NOT NULL, kind TEXT NOT NULL, external_id TEXT NOT NULL,
 revision INTEGER NOT NULL, record_id TEXT NOT NULL REFERENCES qettyq_hub_records(id), fetched_at TEXT NOT NULL,
 PRIMARY KEY(source_id,kind,external_id)
);
CREATE TABLE IF NOT EXISTS qettyq_hub_places(
 id TEXT PRIMARY KEY, source_id TEXT NOT NULL, external_id TEXT NOT NULL, city_id TEXT NOT NULL,
 name TEXT NOT NULL, category TEXT, address TEXT, lat REAL, lon REAL, coordinate_quality TEXT NOT NULL,
 opening_hours TEXT, tags_json TEXT NOT NULL, source_url TEXT NOT NULL, fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL,
 CHECK((lat IS NULL AND lon IS NULL) OR (lat BETWEEN -90 AND 90 AND lon BETWEEN -180 AND 180)), UNIQUE(source_id,external_id)
);
CREATE TABLE IF NOT EXISTS qettyq_hub_events(
 id TEXT PRIMARY KEY, source_id TEXT NOT NULL, external_id TEXT NOT NULL, city_id TEXT NOT NULL,
 name TEXT NOT NULL, category TEXT, venue_id TEXT REFERENCES qettyq_hub_places(id), organizer_url TEXT,
 booking_url TEXT, description TEXT, source_url TEXT NOT NULL, fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL,
 UNIQUE(source_id,external_id)
);
CREATE TABLE IF NOT EXISTS qettyq_hub_occurrences(
 id TEXT PRIMARY KEY, source_id TEXT NOT NULL, external_id TEXT NOT NULL, city_id TEXT NOT NULL,
 event_id TEXT NOT NULL REFERENCES qettyq_hub_events(id), venue_id TEXT REFERENCES qettyq_hub_places(id),
 starts_at TEXT NOT NULL, ends_at TEXT, time_zone TEXT NOT NULL CHECK(time_zone='Asia/Almaty'), status TEXT NOT NULL,
 languages_json TEXT NOT NULL, availability TEXT NOT NULL,
 source_url TEXT NOT NULL, fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL, UNIQUE(source_id,external_id)
);
CREATE INDEX IF NOT EXISTS hub_occurrences_city_date ON qettyq_hub_occurrences(city_id,starts_at,expires_at,status);
CREATE TABLE IF NOT EXISTS qettyq_hub_offers(
 id TEXT PRIMARY KEY, source_id TEXT NOT NULL, external_id TEXT NOT NULL, city_id TEXT NOT NULL,
 target_kind TEXT NOT NULL, target_id TEXT NOT NULL, price_kind TEXT NOT NULL,
 min_minor INTEGER, max_minor INTEGER, currency TEXT, basis TEXT NOT NULL,
 valid_from TEXT, valid_until TEXT, availability TEXT NOT NULL, booking_url TEXT,
 source_url TEXT NOT NULL, fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL,
 CHECK(min_minor IS NULL OR min_minor>=0), CHECK(max_minor IS NULL OR max_minor>=min_minor), UNIQUE(source_id,external_id)
);
CREATE TABLE IF NOT EXISTS qettyq_hub_provenance(
 entity_id TEXT NOT NULL, field TEXT NOT NULL, quality TEXT NOT NULL, method TEXT NOT NULL,
 method_id TEXT, source_url TEXT NOT NULL, fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL,
 PRIMARY KEY(entity_id,field)
);
CREATE TABLE IF NOT EXISTS qettyq_hub_media_grants(
 source_id TEXT NOT NULL, asset_url TEXT NOT NULL, license TEXT NOT NULL, evidence_url TEXT NOT NULL,
 credit TEXT NOT NULL, allow_display INTEGER NOT NULL CHECK(allow_display IN(0,1)),
 allow_download INTEGER NOT NULL CHECK(allow_download IN(0,1)), allow_llm INTEGER NOT NULL CHECK(allow_llm IN(0,1)),
 expires_at_ms INTEGER NOT NULL, PRIMARY KEY(source_id,asset_url)
);
CREATE TABLE IF NOT EXISTS qettyq_hub_media(
 entity_id TEXT NOT NULL, external_id TEXT NOT NULL, asset_url TEXT NOT NULL, source_url TEXT NOT NULL,
 media_type TEXT NOT NULL, author TEXT, license TEXT, evidence_url TEXT, credit TEXT,
 allow_display INTEGER NOT NULL DEFAULT 0, allow_download INTEGER NOT NULL DEFAULT 0, allow_llm INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(entity_id,external_id)
);
`;
