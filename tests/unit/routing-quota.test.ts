import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { reserveRoutingRequest } from '../../src/server/pilot/routing-quota';
import type { PublicAIDatabase, PublicAIStatement } from '../../src/server/pilot/public-ai-budget';

describe('global street-routing limit, real SQLite', () => {
  it('serializes contenders, limits 200 per day and never stores route coordinates', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      sqlite.exec('CREATE TABLE qettyq_routing_throttle (id TEXT PRIMARY KEY, requested_at_ms INTEGER NOT NULL, utc_day TEXT NOT NULL, daily_count INTEGER NOT NULL CHECK(daily_count BETWEEN 1 AND 200))');
      const db: PublicAIDatabase = { prepare(query) {
        const p = sqlite.prepare(query); let args: (string | number)[] = [];
        const statement: PublicAIStatement = {
          bind(...values) { args = values; return statement; },
          async run() { return { success: true, meta: { changes: Number(p.run(...args).changes) } }; },
          async first<T>() { return (p.get(...args) ?? null) as T | null; },
        }; return statement;
      } };
      const start = Date.parse('2026-10-20T00:00:00Z');
      const results = await Promise.all(Array.from({ length: 10 }, (_, i) => reserveRoutingRequest(db, `s-${i}`, start)));
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await reserveRoutingRequest(db, 's', start + 1499)).toBe(false);
      for (let i = 1; i < 200; i++) expect(await reserveRoutingRequest(db, 's', start + i * 1500)).toBe(true);
      expect(await reserveRoutingRequest(db, 's', start + 200 * 1500)).toBe(false);
      expect(await reserveRoutingRequest(db, 's', start + 86_400_000)).toBe(true);
      expect(sqlite.prepare('SELECT * FROM qettyq_routing_throttle').get()).toMatchObject({ daily_count: 1, utc_day: '2026-10-21' });
    } finally { sqlite.close(); }
  });
  it('fails closed without storage, auth or a valid clock', async () => {
    expect(await reserveRoutingRequest(undefined, 's')).toBe(false);
    expect(await reserveRoutingRequest({ prepare() { throw new Error('offline'); } }, 's')).toBe(false);
    expect(await reserveRoutingRequest({ prepare() { throw new Error('unused'); } }, '', NaN)).toBe(false);
  });
});
