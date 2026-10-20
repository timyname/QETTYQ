import type { SmartAssistantAccounting, SmartAssistantDependencies } from "./smart-assistant";

/** Owner approval is fixed across restarts/deploys. Never rotate it to replenish funds. */
export const PUBLIC_AI_APPROVAL_ID = "qettyq-public-ai-10usd-20261020-v1";
export const PUBLIC_AI_CAP_MICRO_USD = 10_000_000;
export const PUBLIC_AI_RESERVE_MICRO_USD = 500_000;
export const PUBLIC_AI_MAX_INPUT_TOKENS = 50_000;
export const PUBLIC_AI_MAX_OUTPUT_TOKENS = 1_200;
export const PUBLIC_AI_COOLDOWN_MS = 60_000;
export const PUBLIC_AI_DAILY_CALLS = 10;

// $5/M input + $30/M output, standard GPT-5.5, verified 2026-10-20.
// 50,000 * $5/M + 1,200 * $30/M = $0.286; reserve $0.50, no refunds.
// This bound covers one plain request OR the bounded planner+answer pair:
// <=8,000 UTF-8 bytes EACH, aggregate input<=50,000 tokens/output<=1,200 tokens,
// planner400+answer800 (reasoning included), no hosted tools,
// attachments, previous_response_id, hidden conversation, background, or retries.
// It is an application reservation cap, NOT an OpenAI project billing guarantee.

export type PublicAIStatement = {
  bind(...values: (string | number)[]): PublicAIStatement;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
  first<T>(): Promise<T | null>;
};
export type PublicAIDatabase = { prepare(query: string): PublicAIStatement };
export type PublicAIBudgetStatus = {
  available: boolean; reason: string | null; remainingCalls: number;
  capMicroUsd: number; reservedMicroUsd: number; reservationMicroUsd: number;
};

/** Schema MUST be installed by a migration, never by request handling. */
export const PUBLIC_AI_RESERVATION_SQL = `
INSERT OR IGNORE INTO qettyq_ai_public_reservations
  (request_id, approval_id, session_hash, reserved_at_ms, utc_day, reserve_micro_usd, status)
SELECT ?, ?, ?, ?, ?, ?, 'reserved'
WHERE
  (SELECT COALESCE(SUM(reserve_micro_usd), 0) FROM qettyq_ai_public_reservations WHERE approval_id = ?) + ? <= ?
  AND NOT EXISTS (SELECT 1 FROM qettyq_ai_public_reservations WHERE approval_id = ? AND status IN ('reserved', 'blocked'))
  AND NOT EXISTS (SELECT 1 FROM qettyq_ai_public_reservations WHERE approval_id = ? AND session_hash = ? AND reserved_at_ms > ?)
  AND (SELECT COUNT(*) FROM qettyq_ai_public_reservations WHERE approval_id = ? AND session_hash = ? AND utc_day = ?) < ?
`;

const STATUS_SQL = `SELECT
  COALESCE(SUM(reserve_micro_usd), 0) AS reserved,
  COALESCE(SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END), 0) AS blocked,
  COALESCE(SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END), 0) AS pending,
  COALESCE(SUM(CASE WHEN session_hash = ? AND reserved_at_ms > ? THEN 1 ELSE 0 END), 0) AS recent,
  COALESCE(SUM(CASE WHEN session_hash = ? AND utc_day = ? THEN 1 ELSE 0 END), 0) AS daily
FROM qettyq_ai_public_reservations WHERE approval_id = ?`;

async function hashSession(sessionId: string) {
  if (!sessionId || sessionId.length > 2048) throw new Error("invalid session");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${PUBLIC_AI_APPROVAL_ID}:${sessionId}`));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

function checkedNow(now: () => number) {
  const value = now();
  if (!Number.isSafeInteger(value) || value < 0 || value > 8_000_000_000_000) throw new Error("invalid clock");
  return { value, day: new Date(value).toISOString().slice(0, 10) };
}

export async function getPublicAIBudgetStatus(db: PublicAIDatabase | undefined, sessionId: string, now: () => number = Date.now): Promise<PublicAIBudgetStatus> {
  const base = { capMicroUsd: PUBLIC_AI_CAP_MICRO_USD, reservationMicroUsd: PUBLIC_AI_RESERVE_MICRO_USD, reservedMicroUsd: 0, remainingCalls: 0 };
  if (!db) return { ...base, available: false, reason: "PUBLIC_BUDGET_STORAGE_UNAVAILABLE" };
  try {
    const sessionHash = await hashSession(sessionId);
    const clock = checkedNow(now);
    const result = await db.prepare(STATUS_SQL).bind(sessionHash, clock.value - PUBLIC_AI_COOLDOWN_MS, sessionHash, clock.day, PUBLIC_AI_APPROVAL_ID)
      .first<{ reserved: number; blocked: number; pending: number; recent: number; daily: number }>();
    if (!result || Object.values(result).some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error("invalid ledger response");
    const remainingCalls = Math.max(0, Math.floor((PUBLIC_AI_CAP_MICRO_USD - result.reserved) / PUBLIC_AI_RESERVE_MICRO_USD));
    const reason = result.blocked ? "PUBLIC_ACCOUNTING_BLOCKED"
      : result.pending ? "PUBLIC_AI_BUSY"
      : remainingCalls === 0 ? "PUBLIC_BUDGET_EXHAUSTED"
      : result.recent ? "PUBLIC_SESSION_COOLDOWN"
      : result.daily >= PUBLIC_AI_DAILY_CALLS ? "PUBLIC_SESSION_DAILY_LIMIT" : null;
    return { ...base, reservedMicroUsd: result.reserved, remainingCalls, available: reason === null, reason };
  } catch { return { ...base, available: false, reason: "PUBLIC_BUDGET_STORAGE_UNAVAILABLE" }; }
}

function validAccounting(record: SmartAssistantAccounting | null) {
  return record !== null && /^gpt-5\.5(?:-\d{4}-\d{2}-\d{2})?$/u.test(record.model)
    && record.serviceTier === "default" && record.toolCalls === 0
    && Number.isSafeInteger(record.inputTokens) && record.inputTokens >= 0 && record.inputTokens <= PUBLIC_AI_MAX_INPUT_TOKENS
    && Number.isSafeInteger(record.outputTokens) && record.outputTokens >= 0 && record.outputTokens <= PUBLIC_AI_MAX_OUTPUT_TOKENS;
}

/** A globally shared conditional INSERT authorizes one call, not a SELECT-then-UPDATE.
 * One pending request at a time; an unknown provider charge blocks the approval.
 * Reservations are never released, even for a rejected answer or provider failure.
 */
export function createPublicAIQuota(options: { db?: PublicAIDatabase; sessionId: string; requestId: string; now?: () => number }): NonNullable<SmartAssistantDependencies["quota"]> {
  let reserved = false;
  let attempted = false;
  let finalized = false;
  let reason: string | null = null;
  const now = options.now ?? Date.now;
  return {
    kind: "durable_public",
    reason: () => reason,
    async reserve() {
      if (attempted || finalized) { reason = "PUBLIC_REQUEST_ALREADY_RESERVED"; return false; }
      attempted = true;
      if (!options.db) { reason = "PUBLIC_BUDGET_STORAGE_UNAVAILABLE"; return false; }
      if (!/^[a-zA-Z0-9_-]{8,128}$/u.test(options.requestId)) { reason = "PUBLIC_REQUEST_ID_INVALID"; return false; }
      try {
        const sessionHash = await hashSession(options.sessionId);
        const clock = checkedNow(now);
        const result = await options.db.prepare(PUBLIC_AI_RESERVATION_SQL).bind(
          options.requestId, PUBLIC_AI_APPROVAL_ID, sessionHash, clock.value, clock.day, PUBLIC_AI_RESERVE_MICRO_USD,
          PUBLIC_AI_APPROVAL_ID, PUBLIC_AI_RESERVE_MICRO_USD, PUBLIC_AI_CAP_MICRO_USD,
          PUBLIC_AI_APPROVAL_ID, PUBLIC_AI_APPROVAL_ID, sessionHash, clock.value - PUBLIC_AI_COOLDOWN_MS,
          PUBLIC_AI_APPROVAL_ID, sessionHash, clock.day, PUBLIC_AI_DAILY_CALLS,
        ).run();
        reserved = result.success === true && result.meta?.changes === 1;
        if (!reserved) {
          reason = (await getPublicAIBudgetStatus(options.db, options.sessionId, now)).reason ?? "PUBLIC_RESERVATION_DENIED";
        }
        return reserved;
      } catch { reason = "PUBLIC_BUDGET_STORAGE_UNAVAILABLE"; return false; }
    },
    async complete(record) {
      if (!reserved || finalized || !options.db) return false;
      finalized = true;
      const valid = validAccounting(record);
      try {
        const result = await options.db.prepare("UPDATE qettyq_ai_public_reservations SET status = ? WHERE request_id = ? AND approval_id = ? AND status = 'reserved'")
          .bind(valid ? "completed" : "blocked", options.requestId, PUBLIC_AI_APPROVAL_ID).run();
        if (!valid || !result.success || result.meta?.changes !== 1) { reason = "PUBLIC_ACCOUNTING_BLOCKED"; return false; }
        return true;
      } catch { reason = "PUBLIC_ACCOUNTING_BLOCKED"; return false; }
    },
  };
}
