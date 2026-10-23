import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DatabaseSync } from 'node:sqlite';
import { openDatastore } from '../../src/server/datastore/sqlite';
import { createMemoryService } from '../../src/server/memory/service';
import { createSession, resetSessionStoreForTests } from '../../src/server/session/store';
import { handleChat } from '../../src/app/api/chat/route';
import { setGooglePlacesRuntime, unavailableGooglePlaces, type GooglePlacesRuntime } from '../../src/server/pilot/google-places';
import type { HostedRuntime } from '../../src/server/pilot/host-runtime';
import type { LiveAstanaEvent } from '../../src/server/ingestion/sxodim-live';
import { pilotContextSchema } from '../../src/server/pilot/contracts';

let directory: string, path: string, cookie: string, session: string, time: number;
let db: DatabaseSync, memory: ReturnType<typeof createMemoryService>;
let fetcher: ReturnType<typeof vi.fn>, google: ReturnType<typeof vi.fn<GooglePlacesRuntime['search']>>;
const priorUserText = 'Завтра балет, до 5000 тенге, три часа';
const priorAssistantText = 'SYNTHETIC TEST: уточните условия';
function fixture(day: number): LiveAstanaEvent {
  const url = `https://sxodim.com/astana/event/synthetic-crossday-${day}`;
  return { id: `synthetic-day-${day}`, name: 'SYNTHETIC TEST · балет', cityId: 'astana', category: 'Балет', venueName: null,
    address: null, lat: null, lon: null, startsAt: `2026-10-${day}T12:00:00+05:00`, endsAt: null,
    timeZone: 'Asia/Almaty', durationMinutes: null, contentLanguage: 'und', priceFromKzt: 1000,
    price: { kind: 'exact', minMinor: 100000, currency: 'KZT', basis: 'person' }, status: 'scheduled', availability: 'unknown',
    bookingUrl: null, contactUrl: url, organizerUrl: null, image: null, requiredCredit: { text: 'Давай Сходим', url },
    fetchedAt: '2026-10-24T18:00:00Z', provenance: { sourceId: 'sxodim-astana-noncommercial', sourceUrl: url,
      parserVersion: 'sxodim-jsonld-v1', scheduleQuality: 'observed', priceQuality: 'observed' }, warnings: ['SYNTHETIC_TEST'] };
}
const events: HostedRuntime['events'] = { get: async () => ({ dataMode: 'snapshot', freshness: 'stale', cacheStatus: 'hit',
  fetchedAt: null, expiresAt: null, source: null, coverage: null, warnings: ['SYNTHETIC_TEST_NO_NETWORK'], items: [fixture(25), fixture(26), fixture(28)] }) };
function request(body?: unknown, method = 'POST') {
  return new Request('https://qettyq.example/api/chat', { method, headers: { 'x-qettyq-session': session,
    cookie, origin: 'https://qettyq.example', 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function grant(scope: 'dialogue' | 'ai_transfer' = 'dialogue') {
  const response = await memory.handle(request({ scope, retention: 'persistent_30d' }), 'grant');
  expect(response.status).toBe(200); cookie = response.headers.get('set-cookie')!.split(';', 1)[0];
}
async function save(text = priorUserText) {
  expect((await memory.recordExchange(request(), { userMessageId: 'u-prior', userText: text,
    assistantMessageId: 'a-prior', assistantText: priorAssistantText, mode: 'deterministic' })).stored).toBe(true);
}
function reopen(advance = 2000) {
  memory.dispose?.(); db.close(); time += advance; db = openDatastore({ path });
  memory = createMemoryService(db, { production: true, now: () => time });
  resetSessionStoreForTests(); session = createSession().id;
}
async function chat(text: string, options: Record<string, unknown> = {}) {
  const response = await handleChat(request({ text, useAI: false, ...options }), undefined, events, memory);
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(JSON.stringify(body)).not.toMatch(/historyCreatedAtMs|createdAtMs|historyWindow|trusted_persisted_turn_dates/u);
  expect(response.headers.get('x-qettyq-trace-id')).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
  return body;
}
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'qettyq-api-crossday-')); path = join(directory, 'memory.sqlite');
  time = Date.parse('2026-10-24T18:59:59Z'); cookie = '';
  vi.spyOn(Date, 'now').mockImplementation(() => time); resetSessionStoreForTests(); session = createSession().id;
  fetcher = vi.fn(async () => { throw new Error('NETWORK_FORBIDDEN_OFFLINE_TEST'); }); vi.stubGlobal('fetch', fetcher);
  google = vi.fn<GooglePlacesRuntime['search']>(async () => unavailableGooglePlaces('SYNTHETIC_TEST_NO_NETWORK'));
  setGooglePlacesRuntime({ search: google });
  db = openDatastore({ path, migrate: true }); memory = createMemoryService(db, { production: true, now: () => time });
});
afterEach(() => {
  memory.dispose?.(); db.close(); resetSessionStoreForTests(); setGooglePlacesRuntime(null);
  vi.restoreAllMocks(); vi.unstubAllGlobals(); rmSync(directory, { recursive: true });
});

describe('actual chat API cross-day memory, synthetic event evidence, zero provider calls', () => {
  it('restores tomorrow against the original day after SQLite restart and guest renewal', async () => {
    await grant(); await save(); reopen(); const body = await chat('Балет');
    expect(body.events.map((value: { id: string }) => value.id)).toEqual(['synthetic-day-25']);
    expect(body.proposedContext).toMatchObject({ budget: 5000, strictBudget: true, minutes: 180 });
    expect(body.mode).toBe('deterministic'); expect(body.memoryStored).toBe(true);
    expect(google).not.toHaveBeenCalled(); expect(await memory.readForAI(request())).toBeNull();
  });
  it('borrows clocks only for the complete identical role/text transcript sent by the client', async () => {
    await grant(); await save(); reopen(); const body = await chat('Балет', { history: [
      { role: 'user', text: priorUserText }, { role: 'assistant', text: priorAssistantText },
    ] });
    expect(body.events.map((value: { id: string }) => value.id)).toEqual(['synthetic-day-25']);
  });
  it('does not lend a saved clock to a divergent browser conversation', async () => {
    await grant(); await save(); reopen(); const body = await chat('Балет', { history: [
      { role: 'user', text: 'Завтра балет, до 4000 тенге' }, { role: 'assistant', text: priorAssistantText },
    ] });
    expect(body.events.map((value: { id: string }) => value.id)).toEqual(['synthetic-day-26']);
    expect(body.proposedContext.budget).toBe(4000);
  });
  it('ignores forged per-turn client timestamps rather than adopting their dates', async () => {
    await grant(); await save(); reopen(); const body = await chat('Балет', { history: [
      { role: 'user', text: priorUserText, createdAtMs: Date.parse('2030-01-01T00:00:00Z') },
      { role: 'assistant', text: priorAssistantText, createdAtMs: 1 },
    ] });
    expect(body.events.map((value: { id: string }) => value.id)).toEqual(['synthetic-day-25']);
    const response = await handleChat(request({ text: 'Балет', useAI: false, historyCreatedAtMs: [1, 1] }), undefined, events, memory);
    expect(response.status).toBe(400);
    expect((await memory.handle(request({ id: 'forged', text: 'Завтра балет', role: 'user', mode: 'user', createdAtMs: 1 }), 'message')).status).toBe(400);
  });
  it('asks for a new day rather than showing an unrelated day when remembered date has elapsed', async () => {
    await grant(); await save(); reopen(3 * 86400_000); const body = await chat('Балет');
    expect(body.reason).toBe('DIALOGUE_CLARIFICATION'); expect(body.events).toEqual([]);
    expect(body.questions.map((value: { field: string }) => value.field)).toContain('date');
    expect(body.proposedContext).toMatchObject({ budget: 5000, minutes: 180 });
  });
  it('honors a fresh day after the old date elapsed without losing current constraints', async () => {
    await grant(); await save(); reopen(3 * 86400_000);
    const body = await chat('Балет завтра', { context: pilotContextSchema.parse({ budget: 2500, strictBudget: false, minutes: 90 }) });
    expect(body.events.map((value: { id: string }) => value.id)).toEqual(['synthetic-day-28']);
    expect(body.proposedContext).toMatchObject({ budget: 2500, strictBudget: false, minutes: 90 });
  });
  it('never sends local-only remembered food or its trusted date metadata to Google', async () => {
    const text = 'Завтра хочу рамен, до 5000 тенге'; await grant(); await save(text); reopen();
    const body = await chat('Один час', { googleConsent: true, history: [
      { role: 'user', text }, { role: 'assistant', text: priorAssistantText },
    ] });
    expect(body.proposedContext).toMatchObject({ goal: 'food', budget: 5000, minutes: 60 });
    expect(google).not.toHaveBeenCalled(); expect(body.googlePlaces).toMatchObject({ status: 'unavailable', reason: 'MEMORY_LOCAL_ONLY', items: [] });
  });
  it('does not resurrect the date or budget after dialogue revoke and guest renewal', async () => {
    await grant(); await save(); reopen();
    expect((await memory.handle(request({ scope: 'dialogue' }, 'DELETE'), 'revoke')).status).toBe(200);
    session = createSession().id; const body = await chat('Балет');
    expect(body.proposedContext.budget).toBeNull(); expect(body.memoryStored).toBe(false);
    expect(body.events.map((value: { id: string }) => value.id)).toEqual(['synthetic-day-25', 'synthetic-day-26', 'synthetic-day-28']);
  });
});
