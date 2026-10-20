import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeVpsRuntime, type VpsRuntime } from "../../src/server/vps/runtime";
import { getHostedRuntime, setHostedRuntime } from "../../src/server/pilot/host-runtime";
import { openDatastore } from "../../src/server/datastore/sqlite";
import { sqliteRoutingDatabase } from "../../src/server/datastore/routing-sqlite";
import { ROUTING_RESERVATION_SQL } from "../../src/server/pilot/routing-quota";
import { PUBLIC_AI_APPROVAL_ID, PUBLIC_AI_RESERVATION_SQL } from "../../src/server/pilot/public-ai-budget";
import baseline from "../../data/livedata/sxodim-astana-2026-10-20.json";
import baselinePlaces from "../../data/places.json";
import type { SxodimSnapshot } from "../../src/server/ingestion/sxodim-live";

let directory: string;
let runtime: VpsRuntime | undefined;
let time: number;
let env: Record<string, string | undefined>;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "qettyq-vps-runtime-")); time = Date.parse("2026-10-20T11:10:00Z");
  env = { NODE_ENV: "production", QETTYQ_DATABASE_PATH: join(directory, "qettyq.sqlite"), QETTYQ_AI_ENABLED: "true",
    QETTYQ_AI_PUBLIC_ENABLED: "true", QETTYQ_AI_PUBLIC_BUDGET_APPROVED: "true", OPENAI_API_KEY: "not-a-real-key-never-sent" };
  setHostedRuntime(null);
});
afterEach(() => { runtime?.close(); runtime = undefined; setHostedRuntime(null); rmSync(directory, { recursive: true }); });
const proof = () => ({ source: "cloudflare-d1", sourceFrozen: true, approvalId: PUBLIC_AI_APPROVAL_ID, verifiedRowCount: 0, rows: [] });
function exportProof(value: unknown = proof()) { const path = join(directory, "verified-d1-export.json"); writeFileSync(path, JSON.stringify(value), { mode: 0o600 }); env.QETTYQ_D1_LEDGER_EXPORT_PATH = path; }

describe("controlled VPS initialization — no providers/network", () => {
  it("imports the actual baseline, registers node-free bridge and consented memory service without exposing unrelated keys", async () => {
    const loadEvents = vi.fn<() => Promise<SxodimSnapshot>>();
    runtime = initializeVpsRuntime({ env, now: () => time, loadEvents });
    expect(getHostedRuntime()).toBe(runtime);
    expect(runtime.diagnostics).toMatchObject({ baselinePlaces: baselinePlaces.length, baselineOccurrences: baseline.items.length, memoryPublic: true, ledgerReady: false, ledgerReason: "PUBLIC_LEDGER_EXPORT_PATH_REQUIRED" });
    expect(runtime.memory?.readForAI).toBeTypeOf("function");
    expect(runtime.events.canSendToLlm?.("osm-overpass-poi")).toBe(true);
    expect(runtime.events.canSendToLlm?.("unknown-source")).toBe(false);
    expect(runtime.routing.env).not.toHaveProperty("OPENAI_API_KEY");
    const data = await runtime.events.get();
    expect(data.items).toHaveLength(baseline.items.length);
    expect(loadEvents).not.toHaveBeenCalled();
    const status = await runtime.ai.getStatus("test-session");
    expect(status).toMatchObject({ available: false, reason: "PUBLIC_BUDGET_STORAGE_UNAVAILABLE" });
    const database = openDatastore({ path: env.QETTYQ_DATABASE_PATH });
    try {
      expect(database.prepare("SELECT COUNT(*) AS n FROM venues WHERE source_id='osm-overpass-poi'").get()?.n).toBe(baselinePlaces.length);
      expect(database.prepare("SELECT allow_fetch,allow_llm FROM data_sources WHERE id='osm-overpass-poi'").get()).toMatchObject({ allow_fetch: 0, allow_llm: 1 });
      const taggedPlaces = baselinePlaces as Array<{ id: string; openingHours?: string | null }>;
      expect(database.prepare("SELECT COUNT(DISTINCT venue_id) AS n FROM venue_opening_hours").get()?.n).toBe(taggedPlaces.filter(place => Boolean(place.openingHours)).length);
      for (const flags of [[0, 1, 1], [1, 0, 1], [1, 1, 0]]) {
        database.prepare("UPDATE data_sources SET allow_persist=?,allow_display=?,allow_llm=? WHERE id='osm-overpass-poi'").run(...flags);
        expect(runtime.events.canSendToLlm?.("osm-overpass-poi")).toBe(false);
      }
    } finally { database.close(); }
    const source = readFileSync(join(process.cwd(), "src/server/pilot/host-runtime.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["']node:|require\(|\bprocess\./u);
    expect(() => initializeVpsRuntime({ env })).toThrow("HOST_RUNTIME_ALREADY_INITIALIZED");
  });
  it("requires explicit frozen verified export on every boot; preserves current ledger after restart", async () => {
    exportProof();
    const loadEvents = vi.fn<() => Promise<SxodimSnapshot>>();
    runtime = initializeVpsRuntime({ env, now: () => time, loadEvents });
    expect(runtime.diagnostics.ledgerReady).toBe(true);
    expect(await runtime.ai.getStatus("test-session")).toMatchObject({ available: true, remainingCalls: 20 });
    const quota = runtime.ai.dependencies("test-session", "startup-test-0001").quota!;
    expect(await quota.reserve()).toBe(true); // SQLite reservation only; no provider call.
    runtime.close();
    runtime = initializeVpsRuntime({ env, now: () => time, loadEvents });
    expect(await runtime.ai.getStatus("other-session")).toMatchObject({ available: false, reason: "PUBLIC_AI_BUSY", remainingCalls: 19 });
    runtime.close();
    delete env.QETTYQ_D1_LEDGER_EXPORT_PATH;
    runtime = initializeVpsRuntime({ env, now: () => time, loadEvents });
    expect(runtime.diagnostics.ledgerReady).toBe(false);
    expect(await runtime.ai.getStatus("other-session")).toMatchObject({ available: false, reason: "PUBLIC_BUDGET_STORAGE_UNAVAILABLE" });
    expect(loadEvents).not.toHaveBeenCalled();
  });
  it.each([
    { ...proof(), sourceFrozen: false },
    { ...proof(), approvalId: "new-budget-not-approved" },
    { ...proof(), verifiedRowCount: 1 },
    { ...proof(), rows: [{ private: "not-a-valid-row" }], verifiedRowCount: 1 },
  ])("fails closed on invalid proof without including file content in diagnostics", async value => {
    exportProof(value);
    runtime = initializeVpsRuntime({ env, now: () => time, loadEvents: vi.fn() });
    expect(runtime.diagnostics).toMatchObject({ ledgerReady: false, ledgerReason: "PUBLIC_LEDGER_EXPORT_INVALID" });
    expect(await runtime.ai.getStatus("session")).toMatchObject({ available: false });
    expect(JSON.stringify(runtime.diagnostics)).not.toContain("not-a-valid-row");
  });
  it("uses persisted cache and a shared refresh lease; initialization itself does not fetch", async () => {
    time = Date.parse("2026-10-20T13:00:00Z");
    const loadEvents = vi.fn(async () => { throw new Error("SOURCE_UNAVAILABLE"); });
    runtime = initializeVpsRuntime({ env, now: () => time, loadEvents });
    expect(loadEvents).not.toHaveBeenCalled();
    expect(await runtime.events.get()).toMatchObject({ dataMode: "snapshot", freshness: "stale" });
    expect(loadEvents).toHaveBeenCalledTimes(1);
    runtime.close();
    runtime = initializeVpsRuntime({ env, now: () => time, loadEvents });
    expect(await runtime.events.get()).toMatchObject({ dataMode: "snapshot", freshness: "stale" });
    expect(loadEvents).toHaveBeenCalledTimes(1); // restart did not replenish the hourly lease.
  });
  it("isolates exact routing SQL from public AI and preserves routing cooldown after restart", async () => {
    runtime = initializeVpsRuntime({ env, now: () => time, loadEvents: vi.fn() });
    expect(await runtime.routing.reserve("valid-session")).toBe(true);
    expect(await runtime.routing.reserve("other-session")).toBe(false);
    runtime.close(); runtime = initializeVpsRuntime({ env, now: () => time, loadEvents: vi.fn() });
    expect(await runtime.routing.reserve("third-session")).toBe(false);
    time += 1500;
    expect(await runtime.routing.reserve("fourth-session")).toBe(true);
    const db = openDatastore({ path: env.QETTYQ_DATABASE_PATH });
    try {
      const adapter = sqliteRoutingDatabase(db);
      expect(() => adapter.prepare(PUBLIC_AI_RESERVATION_SQL)).toThrow("UNSUPPORTED_ROUTING_QUERY");
      expect(() => adapter.prepare("DELETE FROM qettyq_routing_throttle")).toThrow("UNSUPPORTED_ROUTING_QUERY");
      await expect(adapter.prepare(ROUTING_RESERVATION_SQL).bind(time, "wrong-day").run()).rejects.toThrow("INVALID_ROUTING_RESERVATION");
      expect(db.prepare("SELECT COUNT(*) AS n FROM qettyq_ai_public_reservations").get()?.n).toBe(0);
    } finally { db.close(); }
  });
});
