import { randomUUID, createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRagTraceStore } from "../../src/server/datastore/rag-traces";
import { RAG_TRACE_TTL_MS, type RagTrace, type RagTraceStore } from "../../src/server/retrieval/trace";

const schema = `CREATE TABLE qettyq_rag_traces(request_id TEXT PRIMARY KEY,session_hash TEXT NOT NULL,created_at_ms INTEGER NOT NULL,expires_at_ms INTEGER NOT NULL,payload_json TEXT NOT NULL);
CREATE INDEX qettyq_rag_traces_session ON qettyq_rag_traces(session_hash);
CREATE INDEX qettyq_rag_traces_expiry ON qettyq_rag_traces(expires_at_ms);`;
const sessionA = "synthetic-session-a".padEnd(48, "a"), sessionB = "synthetic-session-b".padEnd(48, "b");
const fixed = Date.parse("2026-10-24T10:00:00Z");
const trace = (createdAtMs = fixed): RagTrace => ({ version: "rag-trace-v1", requestId: randomUUID(), createdAtMs,
  versions: { corpus: "osm-astana-20261019_sxodim-hourly", query: "multilingual-lexical-v2", dialogue: "leisure-dialogue-v2", index: "none", generation: "existing-bounded-plan-answer-v1" },
  language: "ru", outcome: "success", generationMode: "deterministic", dataMode: "snapshot", reason: "matched",
  counts: { history: 2, places: 1, events: 0, excluded: null }, selectedEntityHashes: ["a".repeat(64)],
  stages: { memory: 0, dialogue: 1, retrieval: 2, generation: 0, total: 3 }, accounting: "not_collected_use_existing_budget_ledger" });
const stores: RagTraceStore[] = [], databases: DatabaseSync[] = [], directories: string[] = [];
function setup(path = ":memory:") {
  const db = new DatabaseSync(path); databases.push(db); db.exec(schema);
  let clock = fixed;
  const store = createRagTraceStore(db, { enabled: true, now: () => clock }); stores.push(store);
  return { db, store, clock: (value: number) => { clock = value; } };
}
afterEach(() => {
  for (const store of stores.splice(0)) store.dispose?.();
  for (const db of databases.splice(0)) { try { db.close(); } catch {} }
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true });
  vi.useRealTimers();
});

describe("privacy-bounded optional SQLite RAG traces", () => {
  it("roundtrips only a strict technical record and stores a namespaced session hash, never the token", () => {
    const { db, store } = setup(), value = trace();
    expect(store.write(sessionA, value)).toBe(true);
    expect(store.read(sessionA, value.requestId)).toEqual(value);
    const row = db.prepare("SELECT * FROM qettyq_rag_traces").get()!;
    expect(row.session_hash).toBe(createHash("sha256").update("qettyq:rag-traces:session:v1\0" + sessionA).digest("hex"));
    expect(JSON.stringify(row)).not.toContain(sessionA);
    expect(row.expires_at_ms).toBe(fixed + RAG_TRACE_TTL_MS);
  });
  it.each(["query", "history", "lat", "lon", "address", "providerOutput", "secret", "sessionId"])("rejects undeclared sensitive field %s", field => {
    const { db, store } = setup();
    expect(store.write(sessionA, { ...trace(), [field]: "SYNTHETIC PRIVATE VALUE" } as RagTrace)).toBe(false);
    expect(db.prepare("SELECT COUNT(*) AS n FROM qettyq_rag_traces").get()!.n).toBe(0);
  });
  it("rejects arbitrary nested data, malformed UUID/hash/clock and invalid sessions", () => {
    const { store } = setup();
    for (const value of [
      { ...trace(), stages: { ...trace().stages, query: "private" } }, { ...trace(), requestId: "unsafe-id" },
      { ...trace(), selectedEntityHashes: ["https://example.invalid/private"] }, { ...trace(), createdAtMs: NaN },
      trace(fixed - 60001), trace(fixed + 60001),
    ]) expect(store.write(sessionA, value as RagTrace)).toBe(false);
    for (const session of ["short", "x".repeat(257), "x".repeat(32) + "/", "x".repeat(32) + "\n"]) {
      expect(store.write(session, trace())).toBe(false);
      expect(store.read(session, randomUUID())).toBe(null);
    }
  });
  it("isolates sessions and permits only identical same-session idempotent writes", () => {
    const { store } = setup(), value = trace();
    expect(store.write(sessionA, value)).toBe(true);
    expect(store.write(sessionA, value)).toBe(true);
    expect(store.write(sessionA, { ...value, outcome: "empty" })).toBe(false);
    expect(store.write(sessionB, value)).toBe(false);
    expect(store.read(sessionB, value.requestId)).toBeNull();
    expect(store.read(sessionA, value.requestId)).toEqual(value);
  });
  it("enforces strict TTL before physical purge and deletes only the requested session", () => {
    const { db, store, clock } = setup(), a = trace(), b = trace();
    store.write(sessionA, a); store.write(sessionB, b);
    store.deleteSession(sessionA);
    expect(store.read(sessionA, a.requestId)).toBeNull();
    expect(store.read(sessionB, b.requestId)).toEqual(b);
    clock(fixed + RAG_TRACE_TTL_MS);
    expect(store.read(sessionB, b.requestId)).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM qettyq_rag_traces").get()!.n).toBe(1);
    store.purge();
    expect(db.prepare("SELECT COUNT(*) AS n FROM qettyq_rag_traces").get()!.n).toBe(0);
  });
  it("rejects future-created records at read time and corrupted or overlong expiry payloads", () => {
    const { db, store } = setup(), value = trace(fixed + 1);
    expect(store.write(sessionA, value)).toBe(false);
    const normal = trace(); store.write(sessionA, normal);
    db.prepare("UPDATE qettyq_rag_traces SET created_at_ms = ?, payload_json = ? WHERE request_id = ?")
      .run(fixed + 1, JSON.stringify({ ...normal, createdAtMs: fixed + 1 }), normal.requestId);
    expect(store.read(sessionA, normal.requestId)).toBeNull();
    db.prepare("UPDATE qettyq_rag_traces SET created_at_ms = ?, payload_json = ?, expires_at_ms = ? WHERE request_id = ?")
      .run(fixed, JSON.stringify(normal), fixed + RAG_TRACE_TTL_MS + 1, normal.requestId);
    expect(store.read(sessionA, normal.requestId)).toBeNull();
    db.prepare("UPDATE qettyq_rag_traces SET expires_at_ms = ?, payload_json = ? WHERE request_id = ?")
      .run(fixed + RAG_TRACE_TTL_MS, JSON.stringify({ ...normal, rawQuery: "PRIVATE" }), normal.requestId);
    expect(store.read(sessionA, normal.requestId)).toBeNull();
  });
  it("retains newest 30 traces per session and never exceeds 10000 globally", () => {
    const { db, store, clock } = setup();
    const values = Array.from({ length: 31 }, (_, i) => trace(fixed + i));
    for (const value of values) { clock(value.createdAtMs); expect(store.write(sessionA, value)).toBe(true); }
    expect(store.read(sessionA, values[0].requestId)).toBeNull();
    expect(store.read(sessionA, values[30].requestId)).toEqual(values[30]);
    expect(db.prepare("SELECT COUNT(*) AS n FROM qettyq_rag_traces").get()!.n).toBe(30);
    db.exec("BEGIN");
    const insert = db.prepare("INSERT INTO qettyq_rag_traces VALUES(?,?,?,?,?)");
    for (let i = 0; i < 10000; i++) insert.run(randomUUID(), createHash("sha256").update(`synthetic-session-${i}`).digest("hex"), fixed - 1, fixed + RAG_TRACE_TTL_MS, "{}");
    db.exec("COMMIT");
    expect(store.write(sessionB, trace(fixed + 30))).toBe(true);
    expect(db.prepare("SELECT COUNT(*) AS n FROM qettyq_rag_traces").get()!.n).toBe(10000);
    expect(store.read(sessionA, values[30].requestId)).toEqual(values[30]);
  });
  it("survives an actual SQLite close/reopen and purges expired records at enabled startup", () => {
    const directory = mkdtempSync(join(tmpdir(), "qettyq-rag-trace-test-")); directories.push(directory);
    const path = join(directory, "traces.sqlite"), { db, store } = setup(path), value = trace();
    expect(store.write(sessionA, value)).toBe(true); store.dispose?.(); db.close();
    const reopened = new DatabaseSync(path); databases.push(reopened);
    const restored = createRagTraceStore(reopened, { enabled: true, now: () => fixed + 1 }); stores.push(restored);
    expect(restored.read(sessionA, value.requestId)).toEqual(value); restored.dispose?.();
    const expired = createRagTraceStore(reopened, { enabled: true, now: () => fixed + RAG_TRACE_TTL_MS }); stores.push(expired);
    expect(reopened.prepare("SELECT COUNT(*) AS n FROM qettyq_rag_traces").get()!.n).toBe(0);
  });
  it("purges on the 60-second timer and dispose removes the interval", () => {
    vi.useFakeTimers();
    const { db, store, clock } = setup(), value = trace(); store.write(sessionA, value);
    clock(fixed + RAG_TRACE_TTL_MS); vi.advanceTimersByTime(60000);
    expect(db.prepare("SELECT COUNT(*) AS n FROM qettyq_rag_traces").get()!.n).toBe(0);
    store.dispose?.(); expect(vi.getTimerCount()).toBe(0);
    expect(store.write(sessionA, trace())).toBe(false);
    expect(() => store.deleteSession(sessionA)).toThrow("RAG_TRACE_STORE_DISPOSED");
  });
  it("disabled mode touches no database and schedules no timers, even without a table", () => {
    vi.useFakeTimers();
    const db = new DatabaseSync(":memory:"); databases.push(db);
    const prepare = vi.spyOn(db, "prepare");
    const store = createRagTraceStore(db, { enabled: false }); stores.push(store);
    expect(store.write(sessionA, trace())).toBe(false); expect(store.read(sessionA, randomUUID())).toBeNull();
    store.deleteSession(sessionA); store.purge(); store.dispose?.();
    expect(prepare).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("optional read/write fail safely when storage is down, but explicit delete/purge fail closed", () => {
    const { db, store } = setup(); db.close();
    expect(store.write(sessionA, trace())).toBe(false); expect(store.read(sessionA, randomUUID())).toBeNull();
    expect(() => store.deleteSession(sessionA)).toThrow(); expect(() => store.purge()).toThrow();
  });
  it("does not create its schema implicitly and propagates enabled startup purge failure", () => {
    const db = new DatabaseSync(":memory:"); databases.push(db);
    expect(() => createRagTraceStore(db, { enabled: true, now: () => fixed })).toThrow();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()).toEqual([]);
  });
});
