/** Additive Node/VPS-only migration. Old app versions ignore this table. */
export const RAG_TRACE_SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS qettyq_rag_traces(
 request_id TEXT PRIMARY KEY, session_hash TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL, expires_at_ms INTEGER NOT NULL,
 payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rag_traces_session ON qettyq_rag_traces(session_hash);
CREATE INDEX IF NOT EXISTS rag_traces_expiry ON qettyq_rag_traces(expires_at_ms);
INSERT OR IGNORE INTO datastore_migrations(version,installed_at)
 VALUES(2,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
`;
