import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { openDatastore } from '../../src/server/datastore/sqlite';
import { importD1Ledger, sqlitePublicAIDatabase } from '../../src/server/datastore/public-ai-sqlite';
import { createPublicAIQuota, PUBLIC_AI_APPROVAL_ID } from '../../src/server/pilot/public-ai-budget';
import { reviewSybilEvidence, sybilBudgetPreflight } from '../../src/server/sybil/shared-budget-gateway';

let sqlite: ReturnType<typeof openDatastore>;
let db: ReturnType<typeof sqlitePublicAIDatabase>;
let clock: number;
const now = () => clock;
const runId = '123e4567-e89b-42d3-a456-426614174000';
const call = (step = 1) => ({ runId, step, input: 'SYNTHETIC TEST QETTYQ evidence, no personal data.' });
const accounting = { model: 'gpt-5.5', serviceTier: 'default', inputTokens: 100, outputTokens: 50, toolCalls: 0 };
const providerReply = () => ({ status: 'completed', model: 'gpt-5.5', service_tier: 'default', usage: { input_tokens: 100, output_tokens: 50 }, output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Synthetic review only.' }] }] });
const success = () => vi.fn<typeof fetch>().mockImplementation(async () => Response.json(providerReply()));
const rows = () => sqlite.prepare('SELECT * FROM qettyq_ai_public_reservations').all();
beforeEach(() => {
  sqlite = openDatastore({ path: ':memory:', migrate: true });
  // Synthetic empty ledger attestation only; production must use existing imported ledger.
  importD1Ledger(sqlite, [], { approvalId: PUBLIC_AI_APPROVAL_ID, source: 'cloudflare-d1', sourceFrozen: true, verifiedRowCount: 0 });
  db = sqlitePublicAIDatabase(sqlite);
  clock = Date.parse('2026-10-24T10:00:00Z');
});
afterEach(() => { sqlite.close(); vi.useRealTimers(); });

describe('Sybil shares the app approval, actual SQLite, no paid calls', () => {
  it('preflight is read-only, no reservation or credential required, missing storage fails closed', async () => {
    expect(await sybilBudgetPreflight(db, now)).toMatchObject({ available: true, approvalId: PUBLIC_AI_APPROVAL_ID, capMicroUsd: 10_000_000 });
    expect(rows()).toHaveLength(0);
    expect(await sybilBudgetPreflight(undefined, now)).toMatchObject({ available: false, reason: 'PUBLIC_BUDGET_STORAGE_UNAVAILABLE' });
    sqlite.exec('DELETE FROM ai_ledger_migrations');
    expect(await sybilBudgetPreflight(db, now)).toMatchObject({ available: false, reason: 'PUBLIC_BUDGET_STORAGE_UNAVAILABLE' });
  });
  it('app19 + Sybil1 exhaust the SAME10USD approval without resetting or refunding', async () => {
    for (let index = 0; index < 19; index++) {
      const quota = createPublicAIQuota({ db, now, sessionId: `app-${index}`, requestId: `synthetic_app_${index}` });
      expect(await quota.reserve()).toBe(true);
      expect(await quota.complete!(accounting)).toBe(true);
    }
    const fetcher = success();
    expect(await reviewSybilEvidence(call(), { db, now, apiKey: 'synthetic-not-a-key', fetcher })).toEqual({ ok: true, text: 'Synthetic review only.' });
    expect(await sybilBudgetPreflight(db, now)).toMatchObject({ available: false, reservedMicroUsd: 10_000_000, remainingCalls: 0 });
    const app = createPublicAIQuota({ db, now, sessionId: 'another-app', requestId: 'synthetic_app_over' });
    expect(await app.reserve()).toBe(false);
    expect(await reviewSybilEvidence(call(2), { db, now, fetcher })).toMatchObject({ ok: false, reason: 'PUBLIC_BUDGET_EXHAUSTED' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(new Set(rows().map(row => row.approval_id))).toEqual(new Set([PUBLIC_AI_APPROVAL_ID]));
  });
  it('concurrent app and Sybil calls serialize through existing atomic pending lock', async () => {
    const app = createPublicAIQuota({ db, now, sessionId: 'app', requestId: 'concurrent_app_1' });
    let release!: () => void;
    const heldProvider = new Promise<void>(resolve => { release = resolve; });
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => { await heldProvider; return Response.json(providerReply()); });
    const appReservation = app.reserve();
    const sybil = reviewSybilEvidence(call(), { db, now, apiKey: 'synthetic', fetcher });
    const appAccepted = await appReservation;
    release();
    const sybilResult = await sybil;
    expect(Number(appAccepted) + Number(sybilResult.ok)).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(appAccepted ? 0 : 1);
    if (!sybilResult.ok) expect(sybilResult.reason).toBe('PUBLIC_AI_BUSY');
    expect(rows()).toHaveLength(1);
  });
  it('only four step IDs per validated run, repeat/restarted gateway is idempotently denied', async () => {
    const fetcher = success();
    for (let step = 1; step <= 4; step++) {
      expect(await reviewSybilEvidence(call(step), { db, now, apiKey: 'synthetic', fetcher })).toMatchObject({ ok: true });
      clock += 61_000;
      expect(await reviewSybilEvidence(call(step), { db, now, apiKey: 'synthetic', fetcher })).toMatchObject({ ok: false });
    }
    expect(await reviewSybilEvidence(call(5), { db, now, apiKey: 'synthetic', fetcher })).toMatchObject({ ok: false, reason: 'SYBIL_RUN_INVALID' });
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(rows()).toHaveLength(4);
  });
  it('pins endpoint, model/tier/output/store/tools/redirects with no retry or alternate provider', async () => {
    const fetcher = success();
    await reviewSybilEvidence(call(), { db, now, apiKey: 'synthetic', fetcher });
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(request).toMatchObject({ redirect: 'error', method: 'POST' });
    expect(JSON.parse(request!.body as string)).toMatchObject({ model: 'gpt-5.5', service_tier: 'default', store: false, max_output_tokens: 800, tools: [], tool_choice: 'none' });
    const other = success();
    expect(await reviewSybilEvidence({ ...call(), provider: 'glm' }, { db, now, fetcher: other })).toMatchObject({ ok: false, reason: 'SYBIL_PROVIDER_UNAPPROVED' });
    expect(other).not.toHaveBeenCalled();
  });
  it.each(['usage', 'model', 'tool', 'oversized', 'network'])('uncertain %s blocks shared approval and retains full reservation', async failure => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      if (failure === 'network') throw new Error('SYNTHETIC error must not leak');
      if (failure === 'oversized') return new Response('x'.repeat(65_537));
      const response = providerReply();
      if (failure === 'usage') response.usage.output_tokens = 801;
      if (failure === 'model') response.model = 'other-model';
      if (failure === 'tool') response.output[0].type = 'web_search_call';
      return Response.json(response);
    });
    expect(await reviewSybilEvidence(call(), { db, now, apiKey: 'synthetic', fetcher })).toEqual({ ok: false, reason: 'PUBLIC_ACCOUNTING_BLOCKED' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(rows()).toMatchObject([{ reserve_micro_usd: 500_000, status: 'blocked' }]);
    expect(await sybilBudgetPreflight(db, now)).toMatchObject({ available: false, reason: 'PUBLIC_ACCOUNTING_BLOCKED' });
    const app = createPublicAIQuota({ db, now, sessionId: 'app', requestId: 'app_after_block' });
    expect(await app.reserve()).toBe(false);
  });
  it('validates input/credential before reserving and cannot reset ledger through malformed run', async () => {
    const fetcher = success();
    expect(await reviewSybilEvidence({ ...call(), runId: 'not-a-uuid' }, { db, now, fetcher })).toMatchObject({ reason: 'SYBIL_RUN_INVALID' });
    expect(await reviewSybilEvidence({ ...call(), input: 'x'.repeat(8192) }, { db, now, fetcher })).toMatchObject({ reason: 'SYBIL_INPUT_INVALID' });
    expect(await reviewSybilEvidence(call(), { db, now, fetcher })).toMatchObject({ reason: 'SYBIL_CREDENTIAL_UNAVAILABLE' });
    expect(fetcher).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(0);
  });
  it('20s timeout makes exactly one failed call, no refund or retry', async () => {
    vi.useFakeTimers();
    let started!: () => void;
    const providerStarted = new Promise<void>(resolve => { started = resolve; });
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new Error('SYNTHETIC timeout')), { once: true });
      started();
    }));
    const result = reviewSybilEvidence(call(), { db, now, apiKey: 'synthetic', fetcher });
    await providerStarted;
    await vi.advanceTimersByTimeAsync(20_001);
    expect(await result).toMatchObject({ ok: false, reason: 'PUBLIC_ACCOUNTING_BLOCKED' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(rows()[0]).toMatchObject({ status: 'blocked', reserve_micro_usd: 500_000 });
  });
  it('preflight CLI reads an existing exhausted SQLite ledger without API credentials or DB mutation', () => {
    const directory = mkdtempSync(join(tmpdir(), 'qettyq-sybil-preflight-test-'));
    const path = join(directory, 'synthetic.sqlite');
    try {
      const fixtureDb = openDatastore({ path, migrate: true });
      try {
        const imported = Array.from({ length: 20 }, (_, index) => ({
          request_id: `synthetic_import_${index}`, approval_id: PUBLIC_AI_APPROVAL_ID,
          session_hash: 'a'.repeat(64), reserved_at_ms: clock, utc_day: '2026-10-24',
          reserve_micro_usd: 500_000, status: index === 19 ? 'blocked' as const : 'completed' as const,
        }));
        importD1Ledger(fixtureDb, imported, { approvalId: PUBLIC_AI_APPROVAL_ID, source: 'cloudflare-d1', sourceFrozen: true, verifiedRowCount: 20 });
      } finally { fixtureDb.close(); }
      const before = readFileSync(path);
      const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/sybil-budget-preflight.ts', '--preflight', path], {
        cwd: process.cwd(), encoding: 'utf8', timeout: 10_000, env: { PATH: process.env.PATH, NODE_ENV: 'test' },
      });
      expect(result.status).toBe(2);
      expect(JSON.parse(result.stdout)).toMatchObject({ mode: 'read_only_preflight', available: false, reason: 'PUBLIC_ACCOUNTING_BLOCKED', reservedMicroUsd: 10_000_000, remainingCalls: 0, providerCalls: 0, paidSimulationRun: false });
      expect(readFileSync(path)).toEqual(before);
      const missing = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/sybil-budget-preflight.ts', '--preflight', join(directory, 'absent.sqlite')], {
        cwd: process.cwd(), encoding: 'utf8', timeout: 10_000, env: { PATH: process.env.PATH, NODE_ENV: 'test' },
      });
      expect(missing.status).toBe(2);
      expect(missing.stderr).toContain('SYBIL_PREFLIGHT_FAILED_CLOSED');
    } finally { rmSync(directory, { recursive: true }); }
  });
});
