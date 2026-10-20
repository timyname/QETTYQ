import { openDatastore, atomic } from "../datastore/sqlite";
import { createGooglePlacesRuntime, getGooglePlacesRuntime, setGooglePlacesRuntime,
  GOOGLE_PLACES_APPROVAL_ID, GOOGLE_PLACES_CAP_MICRO_USD, GOOGLE_PLACES_RESERVE_MICRO_USD } from "../pilot/google-places";
import type { DatabaseSync } from "node:sqlite";

export const GOOGLE_RESERVATIONS_SCHEMA = `CREATE TABLE IF NOT EXISTS qettyq_google_reservations(
  request_id TEXT PRIMARY KEY,approval_id TEXT NOT NULL,reserved_at_ms INTEGER NOT NULL,
  reserve_micro_usd INTEGER NOT NULL CHECK(reserve_micro_usd=100000));
  CREATE INDEX IF NOT EXISTS qettyq_google_approval ON qettyq_google_reservations(approval_id,reserved_at_ms);`;
export function createGoogleReservation(db: DatabaseSync, clock: () => number = Date.now) {
  return (requestId: string) => {
    if (!/^[a-zA-Z0-9_-]{1,128}$/u.test(requestId)) return false;
    const now = clock(); if (!Number.isSafeInteger(now) || now < 0) return false;
    return atomic(db, () => Number(db.prepare(`INSERT OR IGNORE INTO qettyq_google_reservations
      SELECT ?,?,?,? WHERE (SELECT COALESCE(SUM(reserve_micro_usd),0) FROM qettyq_google_reservations WHERE approval_id=?) + ? <= ?
      AND NOT EXISTS(SELECT 1 FROM qettyq_google_reservations WHERE approval_id=? AND reserved_at_ms>?)`)
      .run(requestId, GOOGLE_PLACES_APPROVAL_ID, now, GOOGLE_PLACES_RESERVE_MICRO_USD, GOOGLE_PLACES_APPROVAL_ID,
        GOOGLE_PLACES_RESERVE_MICRO_USD, GOOGLE_PLACES_CAP_MICRO_USD, GOOGLE_PLACES_APPROVAL_ID, now - 1500).changes) === 1);
  };
}

export function initializeVpsGoogleRuntime(env: Record<string, string | undefined> = process.env) {
  if (getGooglePlacesRuntime()) return;
  let db: DatabaseSync | undefined;
  if (env.GOOGLE_MAPS_SERVER_API_KEY && env.QETTYQ_GOOGLE_PLACES_ENABLED === "true" && env.QETTYQ_GOOGLE_BUDGET_APPROVED === "true") {
    db = openDatastore({ path: env.QETTYQ_DATABASE_PATH, production: env.NODE_ENV === "production", migrate: false });
    // Controlled startup only. No query, places content or coordinates are stored.
    db.exec(GOOGLE_RESERVATIONS_SCHEMA);
  }
  setGooglePlacesRuntime(createGooglePlacesRuntime({ key: env.GOOGLE_MAPS_SERVER_API_KEY,
    enabled: env.QETTYQ_GOOGLE_PLACES_ENABLED === "true", approved: env.QETTYQ_GOOGLE_BUDGET_APPROVED === "true",
    reserve: db ? createGoogleReservation(db) : undefined,
  }));
}
