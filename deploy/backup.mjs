import { DatabaseSync, backup } from 'node:sqlite';
import { chmodSync, readdirSync, statSync, unlinkSync } from 'node:fs';

const directory = '/var/backups/qettyq';
const now = Date.now();
const filename = `qettyq-${new Date(now).toISOString().replace(/[:.]/g, '-')}.sqlite`;
const path = `${directory}/${filename}`;
const db = new DatabaseSync('/var/lib/qettyq/qettyq.sqlite', { readOnly: true });
try { await backup(db, path); chmodSync(path, 0o600); }
finally { db.close(); }
const check = new DatabaseSync(path, { readOnly: true });
try { if (check.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('BACKUP_INTEGRITY_FAILED'); }
finally { check.close(); }
// Only app-owned, exact-pattern backups older than seven days; never source DB.
for (const entry of readdirSync(directory)) {
  if (!/^qettyq-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-\d{3}Z\.sqlite$/.test(entry)) continue;
  const oldPath = `${directory}/${entry}`;
  const info = statSync(oldPath);
  if (info.isFile() && now - info.mtimeMs > 7 * 86_400_000) unlinkSync(oldPath);
}
console.log('QETTYQ SQLite backup verified; retention seven days.');
