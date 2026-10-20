import type { DatabaseSync } from "node:sqlite";
import type { PublicAIDatabase, PublicAIStatement } from "../pilot/public-ai-budget";
import { ROUTING_RESERVATION_SQL } from "../pilot/routing-quota";

const normalize = (query: string) => query.trim().replace(/\s+/gu, " ");
const allowedQuery = normalize(ROUTING_RESERVATION_SQL);

/** A different adapter from public AI: only the existing routing INSERT is allowed.
 * Cannot read/update/delete the AI ledger or bypass its verified-import gate.
 */
export function sqliteRoutingDatabase(db: DatabaseSync): PublicAIDatabase {
  return { prepare(query) {
    if (normalize(query) !== allowedQuery) throw new Error("UNSUPPORTED_ROUTING_QUERY");
    const statement = (values: (string | number)[] = []): PublicAIStatement => ({
      bind: (...next) => statement(next),
      async run() {
        const [time, day] = values;
        if (values.length !== 2 || typeof time !== "number" || !Number.isSafeInteger(time) || time < 0 || time > 8_000_000_000_000
          || typeof day !== "string" || day !== new Date(time).toISOString().slice(0, 10)) throw new Error("INVALID_ROUTING_RESERVATION");
        const result = db.prepare(query).run(...values);
        return { success: true, meta: { changes: Number(result.changes) } };
      },
      async first() { throw new Error("UNSUPPORTED_ROUTING_QUERY"); },
    });
    return statement();
  } };
}
