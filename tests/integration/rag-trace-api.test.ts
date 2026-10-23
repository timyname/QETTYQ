import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { openDatastore } from '../../src/server/datastore/sqlite';
import { createRagTraceStore } from '../../src/server/datastore/rag-traces';
import { RAG_TRACE_SCHEMA_V1 } from '../../src/server/retrieval/schema';
import type { RagTraceStore } from '../../src/server/retrieval/trace';
import { handleChat } from '../../src/app/api/chat/route';
import { GET as diagnostic } from '../../src/app/api/diagnostics/rag/[id]/route';
import { DELETE as deleteSessionData } from '../../src/app/api/session/data/route';
import { DELETE as deleteMemory } from '../../src/app/api/memory/route';
import { createSession, resetSessionStoreForTests } from '../../src/server/session/store';
import { getSession } from '../../src/server/session/store';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import { setHostedRuntime, type HostedRuntime } from '../../src/server/pilot/host-runtime';
import { createPublicAIRuntime } from '../../src/server/pilot/public-ai-runtime';
import type { LiveEventsResult } from '../../src/server/ingestion/live-events';
import type { MemoryService } from '../../src/server/memory/contracts';

const clock = Date.parse('2026-10-24T07:00:00Z');
let db: DatabaseSync, directory: string, store: RagTraceStore, session: string;
let fetcher: ReturnType<typeof vi.fn>;
const events: HostedRuntime['events'] = { get: async () => ({ dataMode: 'snapshot', freshness: 'stale', cacheStatus: 'hit',
  fetchedAt: null, expiresAt: null, source: null, coverage: null, warnings: [], items: [] }) };
function hosted(traces: RagTraceStore = store, memory?: MemoryService) {
  setHostedRuntime({ ai: createPublicAIRuntime({ NODE_ENV: 'production' }), events,
    routing: { reserve: async () => false }, ragTraces: traces, memory });
}
function request(method: string, body?: unknown, id = session, path = '/api/chat') {
  return new Request(`https://qettyq.example${path}`, { method,
    headers: { origin: 'https://qettyq.example', 'content-type': 'application/json', ...(id ? { 'x-qettyq-session': id } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const read = (id: string, owner = session) => diagnostic(request('GET', undefined, owner, `/api/diagnostics/rag/${id}`), { params: Promise.resolve({ id }) });
function traceId(response: Response) {
  const id = response.headers.get('x-qettyq-trace-id');
  expect(id).toMatch(/^[a-f0-9-]{36}$/u); return id!;
}
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(clock);
  fetcher = vi.fn(async () => { throw new Error('NETWORK_FORBIDDEN_OFFLINE_TEST'); });
  vi.stubGlobal('fetch', fetcher);
  resetSessionStoreForTests(); session = createSession().id;
  directory = mkdtempSync(join(tmpdir(), 'qettyq-rag-api-'));
  db = openDatastore({ path: join(directory, 'trace.sqlite'), migrate: true });
  db.exec(RAG_TRACE_SCHEMA_V1);
  store = createRagTraceStore(db, { enabled: true, now: () => clock });
  hosted();
});
afterEach(() => {
  setHostedRuntime(null); store.dispose?.(); db.close();
  resetSessionStoreForTests(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  rmSync(directory, { recursive: true });
});

describe('R2 chat diagnostics API with real SQLite, offline sources', () => {
  it('keeps a long dinner-to-standup correction non-food through final retrieval and never starts Google enrichment', async () => {
    const history = [{ role: 'user', text: 'Хочу на свидание' }, { role: 'user', text: 'Завтра ужин, до 12000 тенге на двоих, два часа' },
      ...Array.from({ length: 16 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: i % 2 ? 'Проверяю варианты.' : 'Хорошо.' }))];
    const response = await handleChat(request('POST', { text: 'А стендап вместо ужина?', history,
      context: pilotContextSchema.parse({}), googleConsent: true, useAI: false }), undefined, events);
    const body = await response.json();
    expect(body.proposedContext).toMatchObject({ goal: 'activity', budget: 12000, minutes: 120, partySize: 2 });
    expect(body.googlePlaces).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses confirmed session settings ahead of old history without discarding the current explicit proposal', async () => {
    const context = pilotContextSchema.parse({ budget: 5000, strictBudget: true, minutes: 120 });
    getSession(session)!.context = context;
    const history = [{ role: 'user', text: 'Концерт через три часа, до 12000 тенге' }];
    const old = await handleChat(request('POST', { text: 'А балет?', context, history }), undefined, events);
    expect((await old.json()).proposedContext).toMatchObject({ budget: 5000, strictBudget: true, minutes: 120 });
    const current = await handleChat(request('POST', { text: 'Балет, до 15000 тенге, два часа', context, history }), undefined, events);
    expect((await current.json()).proposedContext).toMatchObject({ budget: 15000, strictBudget: true, minutes: 120 });
    expect(getSession(session)!.context).toEqual(context); // proposals do not silently edit confirmed settings
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    ['Хочу на свидание', 'clarify', 'not_retrieved'],
    ['Парк', 'success', 'snapshot'],
    ['Хочу армрестлинг', 'empty', 'snapshot'],
  ] as const)('records %s without changing the deterministic response', async (text, outcome, dataMode) => {
    const response = await handleChat(request('POST', { text, useAI: false }), undefined, events, undefined, store);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.mode).toBe('deterministic');
    const id = traceId(response), result = await read(id);
    expect(result.status).toBe(200); expect(result.headers.get('cache-control')).toContain('no-store');
    const { trace } = await result.json();
    expect(trace).toMatchObject({ requestId: id, outcome, dataMode, generationMode: 'deterministic', counts: { places: body.items.length, events: body.events.length } });
    expect(trace.selectedEntityHashes).toHaveLength(Math.min(6, body.items.length + body.events.length));
    expect(trace.selectedEntityHashes.every((value: string) => /^[a-f0-9]{64}$/u.test(value))).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('records a source failure as unavailable empty fallback, not invented results', async () => {
    const get = vi.fn(async () => { throw new Error('PRIVATE SOURCE ERROR SECRET'); });
    const response = await handleChat(request('POST', { text: 'Концерт завтра', useAI: false }), undefined, { get }, undefined, store);
    const body = await response.json();
    expect(body.events).toEqual([]); expect(body.eventsMeta.dataMode).toBe('unavailable');
    const { trace } = await (await read(traceId(response))).json();
    expect(trace).toMatchObject({ outcome: 'empty', dataMode: 'unavailable', reason: 'no_match' });
    expect(JSON.stringify(trace)).not.toContain('PRIVATE SOURCE');
    expect(get).toHaveBeenCalledOnce(); expect(fetcher).not.toHaveBeenCalled();
  });

  it('records a caught pipeline throw without persisting its raw error or swallowing it', async () => {
    const raw = 'PRIVATE PROVIDER OUTPUT 51.123456';
    const malformed: LiveEventsResult = { ...await events.get(), get items(): LiveEventsResult['items'] { throw new Error(raw); } };
    await expect(handleChat(request('POST', { text: 'Концерт завтра' }), undefined,
      { get: async () => malformed }, undefined, store)).rejects.toThrow(raw);
    const rows = db.prepare('SELECT request_id, payload_json FROM qettyq_rag_traces').all();
    expect(rows).toHaveLength(1);
    const { trace } = await (await read(String(rows[0].request_id))).json();
    expect(trace).toMatchObject({ outcome: 'error', reason: 'pipeline_error', generationMode: 'not_executed' });
    expect(String(rows[0].payload_json)).not.toContain(raw);
  });

  it('isolates guest ownership and stores no raw query, history, coordinates or provider content', async () => {
    const raw = 'PRIVATE QUERY ЖЖЖ 51.123456, 71.654321';
    const response = await handleChat(request('POST', { text: `Парк ${raw}`, useAI: false,
      history: [{ role: 'assistant', text: 'PRIVATE PROVIDER OUTPUT' }, { role: 'user', text: 'PRIVATE HISTORY' }],
      context: { origin: { lat: 51.123456, lon: 71.654321 } } }), undefined, events, undefined, store);
    const id = traceId(response);
    const own = await read(id); expect(own.status).toBe(200);
    const serialized = JSON.stringify(db.prepare('SELECT * FROM qettyq_rag_traces').all());
    for (const forbidden of [raw, 'PRIVATE QUERY', 'PRIVATE HISTORY', 'PRIVATE PROVIDER OUTPUT', '51.123456', '71.654321', session]) expect(serialized).not.toContain(forbidden);
    const ownBody = await own.json();
    expect(ownBody.trace.counts.history).toBe(2);
    expect((await read(id, createSession().id)).status).toBe(404);
    expect((await read(id, '')).status).toBe(401);
    expect((await read('not-a-uuid')).status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('removes current guest traces through session-data deletion without deleting another guest', async () => {
    const ownResponse = await handleChat(request('POST', { text: 'Привет' }), undefined, events, undefined, store);
    const ownId = traceId(ownResponse), other = createSession().id;
    const otherResponse = await handleChat(request('POST', { text: 'Привет' }, other), undefined, events, undefined, store);
    const otherId = traceId(otherResponse);
    const deleted = await deleteSessionData(request('DELETE', undefined, session, '/api/session/data'));
    expect(deleted.status).toBe(200); expect((await deleted.json()).deleted).toBe(true);
    expect(store.read(session, ownId)).toBeNull(); expect(store.read(other, otherId)).not.toBeNull();
  });

  it('full memory deletion also removes current traces and reports trace-deletion failure as 503', async () => {
    const handle = vi.fn(async () => Response.json({ deleted: true }, { headers: { 'cache-control': 'no-store' } }));
    const memory: MemoryService = { handle, readForAI: async () => null, recordExchange: async () => ({ stored: false, reason: null }) };
    hosted(store, memory);
    const first = traceId(await handleChat(request('POST', { text: 'Привет' }), undefined, events, undefined, store));
    const response = await deleteMemory(request('DELETE', undefined, session, '/api/memory'));
    expect(response.status).toBe(200); expect(store.read(session, first)).toBeNull();
    const failure: RagTraceStore = { ...store, deleteSession() { throw new Error('STORE_DELETE_FAILED'); } };
    hosted(failure, memory);
    const failed = await deleteMemory(request('DELETE', undefined, session, '/api/memory'));
    expect(failed.status).toBe(503); expect(await failed.json()).toMatchObject({ deleted: false, error: { code: 'DIAGNOSTIC_DELETE_UNAVAILABLE' } });
    expect(failed.headers.get('cache-control')).toContain('no-store');
    expect(handle).toHaveBeenCalledTimes(2);
  });

  it('disabled R2 keeps replies and source-call count unchanged and stores no new trace', async () => {
    const disabled = createRagTraceStore(db, { enabled: false });
    const get = vi.fn(events.get);
    const body = { text: 'Концерт завтра', useAI: false };
    const without = await handleChat(request('POST', body), undefined, { get }, undefined, disabled);
    const withTrace = await handleChat(request('POST', body), undefined, { get }, undefined, store);
    const first = await without.json(), second = await withTrace.json();
    for (const key of ['reply', 'mode', 'events', 'items', 'proposedContext']) expect(first[key]).toEqual(second[key]);
    expect(without.headers.has('x-qettyq-trace-id')).toBe(false);
    traceId(withTrace);
    expect(db.prepare('SELECT COUNT(*) n FROM qettyq_rag_traces').get()?.n).toBe(1);
    expect(get).toHaveBeenCalledTimes(2); expect(fetcher).not.toHaveBeenCalled();
  });
});
