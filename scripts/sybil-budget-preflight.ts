import { lstatSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { sqlitePublicAIDatabase } from '../src/server/datastore/public-ai-sqlite';
import { sybilBudgetPreflight } from '../src/server/sybil/shared-budget-gateway';

// Read-only audit only. Never opens env files, migrates tables, reserves or calls APIs.
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--preflight' || !isAbsolute(args[1])) throw new Error('USAGE: --preflight /absolute/existing/qettyq.sqlite');
  const stat = lstatSync(args[1]);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('EXISTING_REGULAR_DATABASE_REQUIRED');
  const db = new DatabaseSync(args[1], { readOnly: true, allowExtension: false });
  try {
    const status = await sybilBudgetPreflight(sqlitePublicAIDatabase(db));
    console.log(JSON.stringify({ mode: 'read_only_preflight', ...status, providerCalls: 0, paidSimulationRun: false }));
    process.exitCode = status.available ? 0 : 2;
  } finally { db.close(); }
}
main().catch(() => { console.error('SYBIL_PREFLIGHT_FAILED_CLOSED'); process.exitCode = 2; });
