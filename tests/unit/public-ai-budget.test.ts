import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPublicAIQuota, getPublicAIBudgetStatus, PUBLIC_AI_RESERVE_MICRO_USD, type PublicAIDatabase, type PublicAIStatement } from "../../src/server/pilot/public-ai-budget";
import { getPublicAIStatus, publicAIAdapterDependencies } from "../../src/server/pilot/public-ai-runtime";
import { answerSmartAssistant, type SmartAssistantAccounting } from "../../src/server/pilot/smart-assistant";
import { pilotContextSchema } from "../../src/server/pilot/contracts";

// Real SQLite executes the production conditional INSERT; no fake JS balance ledger.
let sqlite: DatabaseSync;
let db: PublicAIDatabase;
let clock: number;
const now = () => clock;
const accounting: SmartAssistantAccounting = { model: "gpt-5.5-2026-04-23", serviceTier: "default", inputTokens: 1200, outputTokens: 300, toolCalls: 0 };
function quota(requestId = "request-00001", sessionId = "session-one") { return createPublicAIQuota({ db, requestId, sessionId, now }); }
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`CREATE TABLE qettyq_ai_public_reservations (
    request_id TEXT PRIMARY KEY NOT NULL, approval_id TEXT NOT NULL, session_hash TEXT NOT NULL,
    reserved_at_ms INTEGER NOT NULL, utc_day TEXT NOT NULL,
    reserve_micro_usd INTEGER NOT NULL CHECK(reserve_micro_usd = 500000),
    status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','completed','blocked'))
  )`);
  db = { prepare(query) {
    const prepared = sqlite.prepare(query);
    let values: (string | number)[] = [];
    const statement: PublicAIStatement = {
      bind(...args) { values = args; return statement; },
      async run() { const result = prepared.run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
      async first<T>() { return (prepared.get(...values) ?? null) as T | null; },
    };
    return statement;
  } };
  clock = Date.parse("2026-10-20T10:00:00Z");
});
afterEach(() => sqlite.close());

describe("public AI durable atomic budget (real SQLite, no paid calls)", () => {
  it("serializes competing reservations and enforces the global cap across fresh quota objects", async () => {
    const contenders = Array.from({ length: 30 }, (_, index) => quota(`parallel-${index.toString().padStart(8, "0")}`, `session-${index}`));
    const accepted = await Promise.all(contenders.map(candidate => candidate.reserve()));
    expect(accepted.filter(Boolean)).toHaveLength(1);
    expect(await getPublicAIBudgetStatus(db, "other-session", now)).toMatchObject({ reason: "PUBLIC_AI_BUSY", reservedMicroUsd: 500000 });
    expect(await contenders[accepted.indexOf(true)].complete!(accounting)).toBe(true);
    for (let index = 1; index < 20; index++) {
      const next = quota(`after-${index.toString().padStart(8, "0")}`, `other-session-${index}`);
      expect(await next.reserve()).toBe(true);
      expect(await next.complete!(accounting)).toBe(true);
    }
    expect(await quota("over-cap-0001", "new-user").reserve()).toBe(false);
    expect(await getPublicAIBudgetStatus(db, "new-user", now)).toMatchObject({ reason: "PUBLIC_BUDGET_EXHAUSTED", reservedMicroUsd: 10000000, remainingCalls: 0 });
    expect(sqlite.prepare("SELECT SUM(reserve_micro_usd) AS total FROM qettyq_ai_public_reservations").get()?.total).toBe(10000000);
  });

  it("keeps cooldown and per-UTC-day limits in the database, while global approval never resets", async () => {
    for (let index = 0; index < 10; index++) {
      const next = quota(`daily-${index.toString().padStart(8, "0")}`);
      expect(await next.reserve()).toBe(true);
      expect(await next.complete!(accounting)).toBe(true);
      expect((await getPublicAIBudgetStatus(db, "session-one", now)).reason).toBe("PUBLIC_SESSION_COOLDOWN");
      expect(await quota(`cooldown-${index.toString().padStart(8, "0")}`).reserve()).toBe(false);
      clock += 61000;
    }
    expect((await getPublicAIBudgetStatus(db, "session-one", now)).reason).toBe("PUBLIC_SESSION_DAILY_LIMIT");
    expect(await quota("daily-extra-00001").reserve()).toBe(false);
    clock += 86400000;
    const tomorrow = quota("tomorrow-00001");
    expect(await tomorrow.reserve()).toBe(true);
    expect(await tomorrow.complete!(accounting)).toBe(true);
    expect((await getPublicAIBudgetStatus(db, "someone-else", now)).reservedMicroUsd).toBe(11 * PUBLIC_AI_RESERVE_MICRO_USD);
  });

  it("prevents repeated request IDs across new instances and never stores the raw session", async () => {
    const first = quota();
    expect(await first.reserve()).toBe(true);
    expect(await first.reserve()).toBe(false);
    expect(await first.complete!(accounting)).toBe(true);
    clock += 61000;
    expect(await quota().reserve()).toBe(false);
    expect(sqlite.prepare("SELECT COUNT(*) AS total FROM qettyq_ai_public_reservations").get()?.total).toBe(1);
    expect(JSON.stringify(sqlite.prepare("SELECT * FROM qettyq_ai_public_reservations").all())).not.toContain("session-one");
    expect(await first.complete!(accounting)).toBe(false);
  });

  it.each([
    null,
    { ...accounting, toolCalls: 1 },
    { ...accounting, serviceTier: "priority" },
    { ...accounting, model: "gpt-6-astra" },
    { ...accounting, inputTokens: 50001 },
    { ...accounting, outputTokens: 1201 },
    { ...accounting, inputTokens: NaN },
  ])("keeps the reservation and blocks all later calls on uncertain/unapproved accounting", async record => {
    const first = quota();
    expect(await first.reserve()).toBe(true);
    expect(await first.complete!(record)).toBe(false);
    expect(await getPublicAIBudgetStatus(db, "other", now)).toMatchObject({ reason: "PUBLIC_ACCOUNTING_BLOCKED", reservedMicroUsd: 500000 });
    expect(await quota("request-00002", "other").reserve()).toBe(false);
  });

  it("fails closed with missing schema, database or malformed inputs", async () => {
    expect(await createPublicAIQuota({ requestId: "request-00001", sessionId: "test" }).reserve()).toBe(false);
    expect((await getPublicAIBudgetStatus(undefined, "test", now)).reason).toBe("PUBLIC_BUDGET_STORAGE_UNAVAILABLE");
    expect(await quota("bad").reserve()).toBe(false);
    expect(await quota("request-00001", "").reserve()).toBe(false);
    sqlite.exec("DROP TABLE qettyq_ai_public_reservations");
    expect(await quota().reserve()).toBe(false);
  });

  it("leaves a lost completion pending and therefore blocks new workers rather than refunding", async () => {
    const first = quota();
    expect(await first.reserve()).toBe(true);
    // Simulate a worker stopping before it reports the provider outcome.
    clock += 86400000;
    expect(await quota("new-worker-00001", "other").reserve()).toBe(false);
    expect((await getPublicAIBudgetStatus(db, "other", now)).reason).toBe("PUBLIC_AI_BUSY");
  });

  it("public runtime has explicit flags, no implicit filesystem/memory fallback or hosted search", async () => {
    const prepare = vi.fn().mockImplementation(() => { throw new Error("No storage access before configuration"); });
    expect(await getPublicAIStatus({ NODE_ENV: "production", DB: { prepare } }, "guest")).toMatchObject({ configured: false, available: false, hostedWebSearch: false, remainingCalls: 0 });
    expect(prepare).not.toHaveBeenCalled();
    const env = { NODE_ENV: "production", QETTYQ_AI_ENABLED: "true", QETTYQ_AI_PUBLIC_ENABLED: "true", QETTYQ_AI_PUBLIC_BUDGET_APPROVED: "true", OPENAI_API_KEY: "mock-key-not-real" };
    expect(await getPublicAIStatus(env, "guest")).toMatchObject({ configured: true, available: false, reason: "PUBLIC_BUDGET_STORAGE_UNAVAILABLE" });
    const deps = publicAIAdapterDependencies({ ...env, DB: db }, "guest", "request-00001");
    expect(deps.executionScope).toBe("public");
    expect(deps.quota!.kind).toBe("durable_public");
  });

  it("runs the adapter through a real durable reservation and completion, without a live request", async () => {
    const deps = publicAIAdapterDependencies({ NODE_ENV: "production", QETTYQ_AI_ENABLED: "true", QETTYQ_AI_PUBLIC_ENABLED: "true", QETTYQ_AI_PUBLIC_BUDGET_APPROVED: "true", OPENAI_API_KEY: "unit-test-not-real", DB: db }, "test-session", "request-adapter-00001");
    deps.fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      status: "completed", model: "gpt-5.5-2026-04-23", service_tier: "default", usage: { input_tokens: 2000, output_tokens: 100 },
      output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify({ intent: "clarify", evidenceIds: [], message: "Помогу уточнить ваши интересы." }), annotations: [] }] }],
    })));
    const result = await answerSmartAssistant({ text: "Что выбрать?", context: pilotContextSchema.parse({}), evidence: { items: [], events: [], reply: "Подтверждённых событий нет." } }, deps);
    expect(result.mode).toBe("openai");
    expect(sqlite.prepare("SELECT status, reserve_micro_usd FROM qettyq_ai_public_reservations").get()).toMatchObject({ status: "completed", reserve_micro_usd: 500000 });
    expect(deps.fetcher).toHaveBeenCalledTimes(1);
  });

  it("persists an unknown provider outcome as blocked and forbids another worker request", async () => {
    const deps = publicAIAdapterDependencies({ NODE_ENV: "production", QETTYQ_AI_ENABLED: "true", QETTYQ_AI_PUBLIC_ENABLED: "true", QETTYQ_AI_PUBLIC_BUDGET_APPROVED: "true", OPENAI_API_KEY: "unit-test-not-real", DB: db }, "test-session", "request-adapter-00001");
    deps.fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("network interrupted after send"));
    const result = await answerSmartAssistant({ text: "Что выбрать?", context: pilotContextSchema.parse({}), evidence: { items: [], events: [], reply: "Подтверждённых событий нет." } }, deps);
    expect(result).toMatchObject({ mode: "deterministic", reason: "PROVIDER_UNAVAILABLE" });
    expect(sqlite.prepare("SELECT status, reserve_micro_usd FROM qettyq_ai_public_reservations").get()).toMatchObject({ status: "blocked", reserve_micro_usd: 500000 });
    expect(await quota("new-request-after-failure", "other-session").reserve()).toBe(false);
  });
});
