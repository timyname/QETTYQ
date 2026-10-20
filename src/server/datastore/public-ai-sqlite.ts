import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { PUBLIC_AI_APPROVAL_ID, PUBLIC_AI_RESERVE_MICRO_USD, type PublicAIDatabase, type PublicAIStatement } from "../pilot/public-ai-budget";
import { atomic } from "./sqlite";

export type AIReservationExport = {
  request_id: string; approval_id: string; session_hash: string; reserved_at_ms: number;
  utc_day: string; reserve_micro_usd: number; status: "reserved" | "completed" | "blocked";
};

/** The caller must independently freeze/verify D1 before export, even for zero rows.
 * Never use an empty new SQLite ledger to replenish the owner's existing approval.
 * This attestation is an operational gate, not cryptographic verification of D1.
 */
export function importD1Ledger(db: DatabaseSync, rows: AIReservationExport[], proof: {
  approvalId: typeof PUBLIC_AI_APPROVAL_ID; source: "cloudflare-d1"; sourceFrozen: true; verifiedRowCount: number;
}) {
  if (proof.approvalId !== PUBLIC_AI_APPROVAL_ID || proof.source !== "cloudflare-d1" || proof.sourceFrozen !== true || proof.verifiedRowCount !== rows.length) throw new Error("D1_EXPORT_PROOF_REQUIRED");
  const normalized = [...rows].sort((a, b) => a.request_id.localeCompare(b.request_id)).map(row => {
    if (row.approval_id !== PUBLIC_AI_APPROVAL_ID || !/^[a-zA-Z0-9_-]{8,128}$/u.test(row.request_id)
      || !/^[a-f0-9]{64}$/u.test(row.session_hash) || !Number.isSafeInteger(row.reserved_at_ms) || row.reserved_at_ms < 0
      || row.reserved_at_ms > 8_000_000_000_000 || new Date(row.reserved_at_ms).toISOString().slice(0, 10) !== row.utc_day
      || row.reserve_micro_usd !== PUBLIC_AI_RESERVE_MICRO_USD || !["reserved", "completed", "blocked"].includes(row.status)) throw new Error("INVALID_D1_EXPORT");
    return { request_id: row.request_id, approval_id: row.approval_id, session_hash: row.session_hash, reserved_at_ms: row.reserved_at_ms,
      utc_day: row.utc_day, reserve_micro_usd: row.reserve_micro_usd, status: row.status };
  });
  if (new Set(normalized.map(row => row.request_id)).size !== normalized.length) throw new Error("DUPLICATE_D1_REQUEST");
  const digest = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  return atomic(db, () => {
    const marker = db.prepare("SELECT source_digest FROM ai_ledger_migrations WHERE approval_id=?").get(PUBLIC_AI_APPROVAL_ID);
    if (marker && marker.source_digest !== digest) throw new Error("LEDGER_REIMPORT_REQUIRES_REVIEW");
    for (const row of normalized) {
      const existing = db.prepare("SELECT * FROM qettyq_ai_public_reservations WHERE request_id=?").get(row.request_id);
      if (existing && Object.entries(row).some(([key, value]) => existing[key] !== value)) throw new Error("LEDGER_ROW_CONFLICT");
      db.prepare("INSERT OR IGNORE INTO qettyq_ai_public_reservations VALUES(?,?,?,?,?,?,?)")
        .run(row.request_id, row.approval_id, row.session_hash, row.reserved_at_ms, row.utc_day, row.reserve_micro_usd, row.status);
    }
    db.prepare("INSERT OR IGNORE INTO ai_ledger_migrations VALUES(?,?,?,?,1)").run(PUBLIC_AI_APPROVAL_ID, digest, rows.length, new Date().toISOString());
    return { importedRows: rows.length, digest, approvalId: PUBLIC_AI_APPROVAL_ID };
  });
}

/** Existing atomic conditional INSERT and accounting SQL run unchanged on SQLite. */
export function sqlitePublicAIDatabase(db: DatabaseSync): PublicAIDatabase {
  return { prepare(query) {
    if (!/\bqettyq_ai_public_reservations\b/iu.test(query)) throw new Error("UNSUPPORTED_BUDGET_QUERY");
    const ready = () => {
      if (!db.prepare("SELECT 1 FROM ai_ledger_migrations WHERE approval_id=? AND source_frozen=1").get(PUBLIC_AI_APPROVAL_ID)) throw new Error("D1_LEDGER_IMPORT_REQUIRED");
    };
    const statement = (values: (string | number)[] = []): PublicAIStatement => ({
      bind: (...next) => statement(next),
      async run() { ready(); const result = db.prepare(query).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
      async first<T>() { ready(); return (db.prepare(query).get(...values) ?? null) as T | null; },
    });
    return statement();
  } };
}
