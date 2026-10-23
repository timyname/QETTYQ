import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { atomic } from "./sqlite";
import { ragTraceSchema, RAG_TRACE_TTL_MS, type RagTraceStore } from "../retrieval/trace";

const SESSION = /^[A-Za-z0-9_-]{32,256}$/u;
const SESSION_LIMIT = 30;
const GLOBAL_LIMIT = 10000;
const clockIsValid = (value: number) => Number.isSafeInteger(value) && value >= 0;
const sessionHash = (session: string) => typeof session === "string" && SESSION.test(session)
  ? createHash("sha256").update("qettyq:rag-traces:session:v1\0").update(session).digest("hex") : null;

/** Optional local diagnostics. Never performs migrations, network calls or logging. */
export function createRagTraceStore(db: DatabaseSync, options: { now?: () => number; enabled: boolean }): RagTraceStore {
  if (!options.enabled) return { write: () => false, read: () => null, deleteSession: () => {}, purge: () => {}, dispose: () => {} };
  const now = options.now ?? Date.now;
  let disposed = false;
  const purge = () => {
    if (disposed) return;
    const clock = now();
    if (!clockIsValid(clock)) throw new Error("RAG_TRACE_CLOCK_INVALID");
    db.prepare("DELETE FROM qettyq_rag_traces WHERE expires_at_ms <= ?").run(clock);
  };
  purge();
  // Public/manual purge propagates failure; a timer cannot reject a request.
  const timer = setInterval(() => { try { purge(); } catch { /* Reads still enforce TTL. */ } }, 60000);
  timer.unref();
  return {
    write(sessionId, value) {
      if (disposed) return false;
      try {
        const session = sessionHash(sessionId), clock = now(), parsed = ragTraceSchema.safeParse(value);
        if (!session || !clockIsValid(clock) || !parsed.success || !clockIsValid(parsed.data.createdAtMs)
          || parsed.data.createdAtMs > clock || clock - parsed.data.createdAtMs > 60000) return false;
        const trace = parsed.data, payload = JSON.stringify(trace);
        const expiry = Math.min(trace.createdAtMs + RAG_TRACE_TTL_MS, clock + RAG_TRACE_TTL_MS);
        if (!clockIsValid(expiry) || expiry <= clock) return false;
        return atomic(db, () => {
          db.prepare("DELETE FROM qettyq_rag_traces WHERE expires_at_ms <= ?").run(clock);
          const existing = db.prepare("SELECT session_hash, payload_json FROM qettyq_rag_traces WHERE request_id = ?").get(trace.requestId);
          if (existing) return existing.session_hash === session && existing.payload_json === payload;
          db.prepare("INSERT INTO qettyq_rag_traces(request_id, session_hash, created_at_ms, expires_at_ms, payload_json) VALUES(?,?,?,?,?)")
            .run(trace.requestId, session, trace.createdAtMs, expiry, payload);
          db.prepare("DELETE FROM qettyq_rag_traces WHERE request_id IN (SELECT request_id FROM qettyq_rag_traces WHERE session_hash = ? ORDER BY created_at_ms DESC, request_id DESC LIMIT -1 OFFSET ?)")
            .run(session, SESSION_LIMIT);
          db.prepare("DELETE FROM qettyq_rag_traces WHERE request_id IN (SELECT request_id FROM qettyq_rag_traces ORDER BY created_at_ms DESC, request_id DESC LIMIT -1 OFFSET ?)")
            .run(GLOBAL_LIMIT);
          return true;
        });
      } catch { return false; }
    },
    read(sessionId, requestId) {
      if (disposed) return null;
      try {
        const session = sessionHash(sessionId), clock = now();
        if (!session || !clockIsValid(clock) || !ragTraceSchema.shape.requestId.safeParse(requestId).success) return null;
        const row = db.prepare("SELECT created_at_ms, expires_at_ms, payload_json FROM qettyq_rag_traces WHERE session_hash = ? AND request_id = ? AND expires_at_ms > ?")
          .get(session, requestId, clock);
        if (!row || typeof row.payload_json !== "string" || typeof row.created_at_ms !== "number" || typeof row.expires_at_ms !== "number") return null;
        const parsed = ragTraceSchema.safeParse(JSON.parse(row.payload_json));
        if (!parsed.success || parsed.data.requestId !== requestId || parsed.data.createdAtMs !== row.created_at_ms
          || !clockIsValid(row.created_at_ms) || !clockIsValid(row.expires_at_ms)
          || row.expires_at_ms <= row.created_at_ms || row.expires_at_ms > row.created_at_ms + RAG_TRACE_TTL_MS
          || row.expires_at_ms > clock + RAG_TRACE_TTL_MS || row.created_at_ms > clock) return null;
        return parsed.data;
      } catch { return null; }
    },
    deleteSession(sessionId) {
      if (disposed) throw new Error("RAG_TRACE_STORE_DISPOSED");
      const session = sessionHash(sessionId);
      if (session) db.prepare("DELETE FROM qettyq_rag_traces WHERE session_hash = ?").run(session);
    },
    purge,
    dispose() { disposed = true; clearInterval(timer); },
  };
}
