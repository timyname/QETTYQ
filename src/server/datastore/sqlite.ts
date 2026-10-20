import { DatabaseSync } from "node:sqlite";
import { chmodSync, existsSync, lstatSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { DATASTORE_SCHEMA_V1 } from "./schema";

/** Node 24 only; keep this module out of Cloudflare Worker/client bundles. */
export function openDatastore(options: { path?: string; production?: boolean; migrate?: boolean } = {}) {
  const production = options.production ?? process.env.NODE_ENV === "production";
  const configured = options.path ?? process.env.QETTYQ_DATABASE_PATH;
  if (production && (!configured || !isAbsolute(configured) || configured === ":memory:")) throw new Error("DURABLE_DATABASE_PATH_REQUIRED");
  // External mutable volume, not a build asset. Do not trace the runtime path.
  const path = configured === ":memory:" ? configured : resolve(/* turbopackIgnore: true */ configured ?? ".sites-runtime/qettyq.sqlite");
  if (path !== ":memory:") {
    mkdirSync(/* turbopackIgnore: true */ dirname(path), { recursive: true, mode: 0o700 });
    if (existsSync(/* turbopackIgnore: true */ path) && lstatSync(/* turbopackIgnore: true */ path).isSymbolicLink()) throw new Error("DATABASE_SYMLINK_REJECTED");
  }
  const db = new DatabaseSync(path, { timeout: 5000, enableForeignKeyConstraints: true, allowExtension: false });
  try {
    if (path !== ":memory:") chmodSync(/* turbopackIgnore: true */ path, 0o600);
    db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;");
    if (path !== ":memory:") for (const suffix of ["-wal", "-shm"]) if (existsSync(/* turbopackIgnore: true */ path + suffix)) chmodSync(/* turbopackIgnore: true */ path + suffix, 0o600);
    if (options.migrate) atomic(db, () => db.exec(DATASTORE_SCHEMA_V1));
    return db;
  } catch (error) { db.close(); throw error; }
}

/** Single writer transaction; no await/network work inside the callback. */
export function atomic<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try { const result = fn(); db.exec("COMMIT"); return result; }
  catch (error) { db.exec("ROLLBACK"); throw error; }
}
