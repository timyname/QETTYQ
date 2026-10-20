/** Node/VPS migration only. Never run from the Worker or a request handler. */
export const DATASTORE_SCHEMA_V1 = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS datastore_migrations(version INTEGER PRIMARY KEY, installed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS data_sources(
 id TEXT PRIMARY KEY, name TEXT NOT NULL, policy_url TEXT NOT NULL,
 allow_persist INTEGER NOT NULL CHECK(allow_persist IN(0,1)),
 allow_display INTEGER NOT NULL CHECK(allow_display IN(0,1)),
 allow_llm INTEGER NOT NULL CHECK(allow_llm IN(0,1)), allow_fetch INTEGER NOT NULL DEFAULT 0 CHECK(allow_fetch IN(0,1)),
 required_credit TEXT, minimum_refresh_minutes INTEGER NOT NULL CHECK(minimum_refresh_minutes>=0)
);
CREATE TABLE IF NOT EXISTS venues(
 id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES data_sources(id), external_id TEXT NOT NULL,
 city_id TEXT NOT NULL CHECK(city_id='astana'), name TEXT NOT NULL, category TEXT,
 address TEXT, lat REAL, lon REAL, tags_json TEXT NOT NULL DEFAULT '[]',
 fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL, source_url TEXT NOT NULL,
 price_min_minor INTEGER, price_max_minor INTEGER, duration_estimate_minutes INTEGER,
 CHECK((lat IS NULL AND lon IS NULL) OR (lat IS NOT NULL AND lon IS NOT NULL AND lat BETWEEN -90 AND 90 AND lon BETWEEN -180 AND 180)),
 UNIQUE(source_id,external_id)
);
CREATE TABLE IF NOT EXISTS venue_opening_hours(
 id TEXT PRIMARY KEY, venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
 source_id TEXT NOT NULL REFERENCES data_sources(id),
 weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
 state TEXT NOT NULL CHECK(state IN('open','closed','unknown')),
 opens_minute INTEGER, closes_minute INTEGER, complete_day INTEGER NOT NULL DEFAULT 0 CHECK(complete_day IN(0,1)),
 source_url TEXT NOT NULL, fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL,
 CHECK((state='open' AND opens_minute IS NOT NULL AND closes_minute IS NOT NULL AND opens_minute>=0 AND closes_minute<=1440 AND opens_minute<closes_minute)
 OR (state!='open' AND opens_minute IS NULL AND closes_minute IS NULL))
);
CREATE TABLE IF NOT EXISTS events(
 id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES data_sources(id), external_id TEXT NOT NULL,
 name TEXT NOT NULL, category TEXT, venue_id TEXT REFERENCES venues(id),
 source_url TEXT NOT NULL, booking_url TEXT, organizer_url TEXT,
 UNIQUE(source_id,external_id)
);
CREATE TABLE IF NOT EXISTS event_occurrences(
 id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id),
 city_id TEXT NOT NULL CHECK(city_id='astana'), starts_at TEXT, ends_at TEXT,
 time_zone TEXT NOT NULL CHECK(time_zone='Asia/Almaty'),
 status TEXT NOT NULL CHECK(status IN('unknown','scheduled','cancelled','postponed','rescheduled')),
 content_languages_json TEXT NOT NULL DEFAULT '[]',
 price_kind TEXT NOT NULL CHECK(price_kind IN('unknown','exact','from','range')),
 price_min_minor INTEGER, price_max_minor INTEGER, currency TEXT, price_basis TEXT NOT NULL DEFAULT 'unknown',
 availability TEXT NOT NULL CHECK(availability IN('unknown','available','sold_out')),
 fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL, data_mode TEXT NOT NULL,
 payload_json TEXT NOT NULL,
 CHECK(price_min_minor IS NULL OR price_min_minor>=0), CHECK(price_max_minor IS NULL OR price_max_minor>=price_min_minor)
);
CREATE INDEX IF NOT EXISTS occurrences_city_date ON event_occurrences(city_id,starts_at,expires_at);
CREATE TABLE IF NOT EXISTS fact_provenance(
 entity_kind TEXT NOT NULL, entity_id TEXT NOT NULL, field TEXT NOT NULL,
 quality TEXT NOT NULL CHECK(quality IN('observed','estimated','unknown','conflicting')),
 source_url TEXT NOT NULL, fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL,
 content_hash TEXT, parser_version TEXT NOT NULL,
 PRIMARY KEY(entity_kind,entity_id,field)
);
CREATE TABLE IF NOT EXISTS media_rights(
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, source_url TEXT NOT NULL, license TEXT,
 evidence_url TEXT, credit TEXT, allow_display INTEGER NOT NULL DEFAULT 0,
 allow_download INTEGER NOT NULL DEFAULT 0, allow_llm INTEGER NOT NULL DEFAULT 0,
 allow_redistribute INTEGER NOT NULL DEFAULT 0,
 CHECK(allow_display IN(0,1) AND allow_download IN(0,1) AND allow_llm IN(0,1) AND allow_redistribute IN(0,1))
);
CREATE TABLE IF NOT EXISTS ingestion_runs(
 id INTEGER PRIMARY KEY, source_id TEXT NOT NULL REFERENCES data_sources(id),
 started_at TEXT NOT NULL, finished_at TEXT NOT NULL, imported_count INTEGER NOT NULL, content_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS source_records(
 source_id TEXT PRIMARY KEY REFERENCES data_sources(id), content_hash TEXT NOT NULL,
 fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL, payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS source_refresh_leases(
 source_id TEXT PRIMARY KEY REFERENCES data_sources(id), attempted_at_ms INTEGER NOT NULL, next_allowed_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS memory_clients(id_hash TEXT PRIMARY KEY, created_at_ms INTEGER NOT NULL, expires_at_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS memory_consents(
 client_hash TEXT NOT NULL REFERENCES memory_clients(id_hash) ON DELETE CASCADE,
 scope TEXT NOT NULL CHECK(scope IN('profile','dialogue','ai_transfer','visits')),
 granted_at_ms INTEGER NOT NULL, expires_at_ms INTEGER NOT NULL,
 PRIMARY KEY(client_hash,scope)
);
CREATE TABLE IF NOT EXISTS memory_profiles(
 client_hash TEXT PRIMARY KEY REFERENCES memory_clients(id_hash) ON DELETE CASCADE,
 preferences_json TEXT NOT NULL, updated_at_ms INTEGER NOT NULL, expires_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS memory_messages(
 client_hash TEXT NOT NULL REFERENCES memory_clients(id_hash) ON DELETE CASCADE,
 id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN('user','assistant')),
 text TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN('openai','deterministic','user')),
 created_at_ms INTEGER NOT NULL, expires_at_ms INTEGER NOT NULL, PRIMARY KEY(client_hash,id)
);
CREATE TABLE IF NOT EXISTS memory_visits(
 client_hash TEXT NOT NULL REFERENCES memory_clients(id_hash) ON DELETE CASCADE,
 entity_kind TEXT NOT NULL CHECK(entity_kind IN('venue','event')), entity_id TEXT NOT NULL,
 visited_at_ms INTEGER NOT NULL, confirmation TEXT NOT NULL CHECK(confirmation='user_confirmed'), expires_at_ms INTEGER NOT NULL,
 PRIMARY KEY(client_hash,entity_kind,entity_id,visited_at_ms)
);
CREATE TABLE IF NOT EXISTS qettyq_ai_public_reservations(
 request_id TEXT PRIMARY KEY NOT NULL, approval_id TEXT NOT NULL, session_hash TEXT NOT NULL,
 reserved_at_ms INTEGER NOT NULL, utc_day TEXT NOT NULL,
 reserve_micro_usd INTEGER NOT NULL CHECK(reserve_micro_usd=500000),
 status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN('reserved','completed','blocked'))
);
CREATE INDEX IF NOT EXISTS ai_public_approval ON qettyq_ai_public_reservations(approval_id);
CREATE INDEX IF NOT EXISTS ai_public_session_time ON qettyq_ai_public_reservations(approval_id,session_hash,reserved_at_ms);
CREATE INDEX IF NOT EXISTS ai_public_session_day ON qettyq_ai_public_reservations(approval_id,session_hash,utc_day);
CREATE TABLE IF NOT EXISTS ai_ledger_migrations(
 approval_id TEXT PRIMARY KEY, source_digest TEXT NOT NULL, source_row_count INTEGER NOT NULL,
 imported_at TEXT NOT NULL, source_frozen INTEGER NOT NULL CHECK(source_frozen=1)
);
CREATE TABLE IF NOT EXISTS qettyq_routing_throttle(
 id TEXT PRIMARY KEY NOT NULL CHECK(id='fossgis-foot-v1'),
 requested_at_ms INTEGER NOT NULL CHECK(requested_at_ms>=0), utc_day TEXT NOT NULL,
 daily_count INTEGER NOT NULL CHECK(daily_count BETWEEN 1 AND 200)
);
INSERT OR IGNORE INTO datastore_migrations(version,installed_at) VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
`;
