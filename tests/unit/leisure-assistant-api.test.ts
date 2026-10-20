import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleChat } from '../../src/app/api/chat/route';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import { pilotPlaces } from '../../src/server/pilot/catalog';
import { createSession, resetSessionStoreForTests } from '../../src/server/session/store';
import { setGooglePlacesRuntime } from '../../src/server/pilot/google-places';
import type { PublicAIRuntime } from '../../src/server/pilot/public-ai-runtime';
import type { LiveEventsResult } from '../../src/server/ingestion/live-events';
import { openDatastore } from '../../src/server/datastore/sqlite';
import { createMemoryService } from '../../src/server/memory/service';

// API integration against real deterministic code/catalogue and isolated SQLite.
// All provider outputs/credentials below are synthetic; global network is denied.
const now = Date.parse('2026-10-21T07:00:00Z');
const baseContext = () => pilotContextSchema.parse({ minutes: 120, budget: null, origin: null });
const user = (text: string) => ({ role: 'user', text });
const assistant = (text: string) => ({ role: 'assistant', text });
const emptyEvents: LiveEventsResult = { items: [], dataMode: 'unavailable', freshness: 'unavailable', cacheStatus: 'miss',
  fetchedAt: null, expiresAt: null, source: null, coverage: null, warnings: ['SYNTHETIC OFFLINE SOURCE'] };
function request(session: string, body: unknown, cookie = '') {
  return new Request('https://qettyq.example/api/chat', { method: 'POST', headers: { 'content-type': 'application/json',
    origin: 'https://qettyq.example', 'x-qettyq-session': session, cookie }, body: JSON.stringify(body) });
}
function fixture(planIntent: 'places' | 'food' | 'events' | 'general' = 'places') {
  const get = vi.fn(async () => emptyEvents), reserve = vi.fn(async () => true), complete = vi.fn(async () => true);
  const search = vi.fn(async () => ({ status: 'live' as const, reason: null, items: [],
    attribution: { text: 'Google Maps' as const, url: 'https://maps.google.com' as const }, storage: 'no_store' as const, mapDisplay: 'external_google_only' as const }));
  setGooglePlacesRuntime({ search });
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const text = body.text?.format?.name === 'qettyq_intent'
      ? JSON.stringify({ intent: planIntent, query: planIntent === 'food' ? 'кофе' : 'парк', cuisineOrDish: null })
      : JSON.stringify({ intent: 'advice', evidenceIds: [], message: 'Предлагаю сравнить варианты из карточек и уточнить детали перед посещением.' });
    return Response.json({ status: 'completed', model: 'gpt-5.5', service_tier: 'default', usage: { input_tokens: 100, output_tokens: 30 },
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }] });
  });
  const dependencies = vi.fn<PublicAIRuntime['dependencies']>(() => ({ executionScope: 'public',
    env: { NODE_ENV: 'production', OPENAI_API_KEY: 'synthetic-offline-placeholder', QETTYQ_AI_ENABLED: 'true', QETTYQ_AI_PUBLIC_ENABLED: 'true', QETTYQ_AI_PUBLIC_BUDGET_APPROVED: 'true' },
    quota: { kind: 'durable_public', reserve, complete }, fetcher }));
  const getStatus = vi.fn<PublicAIRuntime['getStatus']>(async () => ({ available: false, configured: false, reason: 'API_KEY_MISSING',
    model: 'gpt-5.5', localTestOnly: false, hostedWebSearch: false, retrievalMode: 'source_evidence', remainingCalls: 0 }));
  return { events: { get }, runtime: { dependencies, getStatus } satisfies PublicAIRuntime, get, search, reserve, complete, fetcher, dependencies };
}
beforeEach(() => {
  resetSessionStoreForTests(); vi.spyOn(Date, 'now').mockReturnValue(now);
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('NETWORK_FORBIDDEN_IN_TEST'); }));
});
afterEach(() => { setGooglePlacesRuntime(null); resetSessionStoreForTests(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('leisure dialogue API integration, offline and no hidden paid work', () => {
  it('dating first turn asks at most two relevant questions before retrieval, Google, AI dependencies or reservation', async () => {
    const mock = fixture();
    const response = await handleChat(request(createSession().id, { text: 'Хочу девушку сводить на свидание', context: baseContext(), useAI: true, googleConsent: true }), mock.runtime, mock.events);
    const result = await response.json();
    expect(response.status).toBe(200); expect(result.reason).toBe('DIALOGUE_CLARIFICATION');
    expect(result.questions.map((question: { field: string }) => question.field)).toEqual(['format', 'date']);
    expect(result.items).toEqual([]); expect(result.events).toEqual([]); expect(result.mode).toBe('deterministic');
    expect(result.memoryStored).toBe(false);
    for (const spy of [mock.get, mock.search, mock.dependencies, mock.reserve, mock.fetcher]) expect(spy).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['Привет!', 'Hello!', 'Сәлем!'])('greeting %s is friendly and never reserves/contacts any provider', async text => {
    const mock = fixture();
    const result = await (await handleChat(request(createSession().id, { text, useAI: true, googleConsent: true }), mock.runtime, mock.events)).json();
    expect(result.reason).toBe('DIALOGUE_CLARIFICATION'); expect(result.questions).toEqual([]);
    expect(result.reply).not.toMatch(/\? .*\?/u);
    for (const spy of [mock.get, mock.search, mock.dependencies, mock.reserve, mock.fetcher]) expect(spy).not.toHaveBeenCalled();
  });

  it('follow-up restores the dating topic but returns only real walk catalogue IDs and explicit money/time constraints', async () => {
    const mock = fixture(), session = createSession().id;
    const first = await (await handleChat(request(session, { text: 'Хочу на свидание', context: baseContext() }), mock.runtime, mock.events)).json();
    const result = await (await handleChat(request(session, { text: 'Завтра прогулка, 5000 тенге, 2 часа', context: baseContext(),
      history: [user('Хочу на свидание'), assistant(first.reply)] }), mock.runtime, mock.events)).json();
    expect(result.reason).not.toBe('DIALOGUE_CLARIFICATION'); expect(result.items.length).toBeGreaterThan(0);
    expect(result.proposedContext).toMatchObject({ goal: 'walk', budget: 5000, minutes: 120, origin: null });
    expect(result.items.every((item: { id: string; tags: string[] }) => pilotPlaces.some(place => place.id === item.id)
      && item.tags.some(tag => ['park', 'garden', 'viewpoint'].includes(tag)))).toBe(true);
    expect(result.items.every((item: { travelMinutes: unknown }) => item.travelMinutes === null)).toBe(true);
    expect(mock.search).not.toHaveBeenCalled(); expect(mock.dependencies).not.toHaveBeenCalled(); expect(mock.reserve).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not invent a monetary constraint from an ambiguous number without units or a pending budget question', async () => {
    const mock = fixture();
    const result = await (await handleChat(request(createSession().id, { text: 'Завтра прогулка, 5000', context: baseContext(),
      history: [user('Хочу на свидание'), assistant('Что вам ближе? На какой день?')] }), mock.runtime, mock.events)).json();
    // Explicit product decision: 5000 alone could be non-money. The adjacent
    // test proves that 5000 тенге is preserved; unknown is neither free nor 5000.
    expect(result.proposedContext).toMatchObject({ goal: 'walk', budget: null });
  });

  it('negative cafe interest never changes an explicit park request or leaks cafe cards', async () => {
    const mock = fixture();
    const result = await (await handleChat(request(createSession().id, { text: 'Парк без кофе', context: baseContext() }), mock.runtime, mock.events)).json();
    expect(result.proposedContext.goal).toBe('walk'); expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item: { category: string; tags: string[] }) => ['park', 'garden', 'viewpoint'].includes(item.category)
      && !item.tags.includes('cafe'))).toBe(true);
    expect(mock.search).not.toHaveBeenCalled(); expect(mock.dependencies).not.toHaveBeenCalled();
  });

  it('API defaults remain explicit false despite UI defaults: no AI dependencies or Google call when flags are omitted', async () => {
    const mock = fixture();
    const result = await (await handleChat(request(createSession().id, { text: 'Кофе', context: baseContext() }), mock.runtime, mock.events)).json();
    expect(result.mode).toBe('deterministic'); expect(mock.dependencies).not.toHaveBeenCalled(); expect(mock.search).not.toHaveBeenCalled();
    expect(result.googlePlaces.status).toBe('consent_required'); expect(result.memoryStored).toBe(false);
  });

  it.each(['food', 'events', 'general'] as const)('a contradictory model %s plan cannot erase a known walk intent or spend unrelated Google budget', async planIntent => {
    const mock = fixture(planIntent);
    const result = await (await handleChat(request(createSession().id, { text: 'Завтра прогулка, 5000 тенге', context: baseContext(),
      history: [user('Хочу на свидание'), assistant('Что вам ближе? На какой день?')], useAI: true, googleConsent: true }), mock.runtime, mock.events)).json();
    expect(mock.search).not.toHaveBeenCalled();
    expect(mock.get).not.toHaveBeenCalled();
    expect(result.proposedContext.goal).toBe('walk'); expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item: { tags: string[] }) => item.tags.some(tag => ['park', 'garden', 'viewpoint'].includes(tag)))).toBe(true);
  });

  it('clarification delegates consent enforcement to the existing durable memory service and never creates a hidden identity', async () => {
    const mock = fixture(), directory = mkdtempSync(join(tmpdir(), 'qettyq-dialogue-api-'));
    const db = openDatastore({ path: join(directory, 'memory.sqlite'), migrate: true });
    const memory = createMemoryService(db, { production: true, now: () => now });
    const record = vi.spyOn(memory, 'recordExchange'), session = createSession().id;
    try {
      const result = await (await handleChat(request(session, { text: 'Хочу на свидание', useAI: true }), mock.runtime, mock.events, memory)).json();
      expect(result.reason).toBe('DIALOGUE_CLARIFICATION'); expect(result.memoryStored).toBe(false);
      expect(record).toHaveBeenCalledOnce(); expect(db.prepare('SELECT COUNT(*) AS n FROM memory_clients').get()?.n).toBe(0);
      expect(db.prepare('SELECT COUNT(*) AS n FROM memory_messages').get()?.n).toBe(0);
      const profile = await memory.handle(request(session, { scope: 'profile', retention: 'session_24h' }), 'grant');
      expect(profile.status).toBe(200); const cookie = profile.headers.get('set-cookie')!.split(';', 1)[0];
      const withoutDialogue = await (await handleChat(request(session, { text: 'Хочу на свидание' }, cookie), mock.runtime, mock.events, memory)).json();
      expect(withoutDialogue.memoryStored).toBe(false);
      expect(db.prepare('SELECT COUNT(*) AS n FROM memory_messages').get()?.n).toBe(0);
      const grant = await memory.handle(request(session, { scope: 'dialogue', retention: 'session_24h' }, cookie), 'grant');
      expect(grant.status).toBe(200);
      const saved = await (await handleChat(request(session, { text: 'Хочу на свидание', useAI: true }, cookie), mock.runtime, mock.events, memory)).json();
      expect(saved.memoryStored).toBe(true); expect(db.prepare('SELECT COUNT(*) AS n FROM memory_clients').get()?.n).toBe(1);
      expect(db.prepare('SELECT COUNT(*) AS n FROM memory_messages').get()?.n).toBe(2);
      expect(await memory.readForAI(request(session, {}, cookie))).toBeNull(); // dialogue does not imply AI-transfer consent.
      for (const spy of [mock.get, mock.search, mock.dependencies, mock.reserve, mock.fetcher]) expect(spy).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    } finally { memory.dispose?.(); db.close(); rmSync(directory, { recursive: true }); }
  });
});
