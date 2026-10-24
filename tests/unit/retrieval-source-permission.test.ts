import { describe, expect, it, vi } from 'vitest';
import { loadEvalInputs } from '../evals/evaluate';
import { runBaseline } from '../evals/baseline-adapter';
import { retrieveEventEvidence } from '../../src/server/ingestion/event-evidence';
import { retrieveAuthorizedEventEvidence } from '../../src/server/retrieval/service';
import { sourcePermission, type RetrievalSourcePolicy } from '../../src/server/retrieval/source-permission';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import type { LiveEventsResult } from '../../src/server/ingestion/live-events';

const now = Date.parse('2026-10-21T07:00:00Z');
const allowed: RetrievalSourcePolicy = { persist: true, display: true, sendToLlm: true, embed: false };
const inputs = loadEvalInputs();
const event = inputs.corpus.syntheticEvents.find(item => item.id === 'synthetic:event:denied')!;
const ctx = pilotContextSchema.parse({});
const feed = (items = [event]): LiveEventsResult => ({ items, dataMode: 'snapshot', freshness: 'fresh', cacheStatus: 'hit', fetchedAt: null, expiresAt: null, source: null, coverage: null, warnings: [] });

describe('source capability boundary before retrieval/top-K, no provider calls', () => {
  it.each([
    [undefined, 'SOURCE_POLICY_MISSING'],
    [{}, 'SOURCE_PERSIST_DENIED'],
    [{ ...allowed, persist: false }, 'SOURCE_PERSIST_DENIED'],
    [{ ...allowed, display: false }, 'SOURCE_DISPLAY_DENIED'],
    [{ ...allowed, revoked: true }, 'SOURCE_POLICY_REVOKED'],
    [{ ...allowed, expiresAt: now }, 'SOURCE_POLICY_EXPIRED'],
    [{ ...allowed, expiresAt: now - 1 }, 'SOURCE_POLICY_EXPIRED'],
    [{ ...allowed, expiresAt: null }, 'SOURCE_POLICY_EXPIRED'],
    [{ ...allowed, expiresAt: Number.NaN }, 'SOURCE_POLICY_EXPIRED'],
  ] as const)('rejects unavailable/denied scope %#', (policy, reason) => {
    expect(sourcePermission('synthetic-test', 'display', () => policy, now)).toEqual({ allowed: false, reason });
  });
  it('fails closed on policy lookup failure without exposing its error', () => {
    expect(sourcePermission('synthetic-test', 'display', () => { throw new Error('private diagnostic'); }, now))
      .toEqual({ allowed: false, reason: 'SOURCE_POLICY_UNAVAILABLE' });
  });
  it('does not treat display permission, LLM permission or consent as embedding permission', () => {
    expect(sourcePermission('synthetic-test', 'display', () => ({ ...allowed, sendToLlm: false }), now)).toEqual({ allowed: true });
    expect(sourcePermission('synthetic-test', 'sendToLlm', () => ({ ...allowed, sendToLlm: false }), now)).toEqual({ allowed: false, reason: 'SOURCE_LLM_DENIED' });
    expect(sourcePermission('synthetic-test', 'embed', () => allowed, now)).toEqual({ allowed: false, reason: 'SOURCE_EMBED_DENIED' });
  });
  it('reproduces the pre-existing pure-function gap, then excludes denied source and evidence at the new boundary', () => {
    // Diagnostic baseline only, not an assertion that legacy output is safe.
    expect(retrieveEventEvidence(feed(), 'События', ctx, now).items.map(item => item.id)).toEqual([event.id]);
    const result = retrieveAuthorizedEventEvidence(feed(), 'События', ctx, now, { resolveSourcePolicy: id => inputs.corpus.sourcePolicies[id] });
    expect(result.items).toEqual([]); expect(result.evidence).toEqual([]);
    expect(result.excluded).toEqual([{ eventId: event.id, reason: 'SOURCE_PERSIST_DENIED' }]);
  });
  it('gates before top-three, retaining a permitted fourth candidate', () => {
    const items = [0, 1, 2, 3].map(index => ({ ...event, id: `synthetic:${index}`, provenance: { ...event.provenance, sourceId: index < 3 ? 'denied' : 'allowed' } }));
    const result = retrieveAuthorizedEventEvidence(feed(items), 'События', ctx, now, { resolveSourcePolicy: id => id === 'allowed' ? allowed : null });
    expect(result.items.map(item => item.id)).toEqual(['synthetic:3']);
    expect(result.excluded).toHaveLength(3);
  });
  it('re-checks changed permissions on each call, without stale grant caching', () => {
    let policy = { ...allowed };
    const resolveSourcePolicy = () => policy;
    expect(retrieveAuthorizedEventEvidence(feed(), 'События', ctx, now, { resolveSourcePolicy }).items).toHaveLength(1);
    policy = { ...policy, display: false };
    expect(retrieveAuthorizedEventEvidence(feed(), 'События', ctx, now, { resolveSourcePolicy }).items).toEqual([]);
  });
  it('retains strict unknown-price, date and unavailable-feed rejection after granting source scope', () => {
    const options = { resolveSourcePolicy: () => allowed };
    const unknown = { ...event, priceFromKzt: null, price: { kind: 'unknown' as const, minMinor: null, currency: null, basis: 'unknown' as const }, provenance: { ...event.provenance, priceQuality: 'unknown' as const } };
    expect(retrieveAuthorizedEventEvidence(feed([unknown]), 'События', { ...ctx, budget: 0, strictBudget: true }, now, options).items).toEqual([]);
    expect(retrieveAuthorizedEventEvidence(feed(), 'События', ctx, Date.parse(event.startsAt) + 1, options).items).toEqual([]);
    expect(retrieveAuthorizedEventEvidence({ ...feed(), dataMode: 'unavailable' }, 'События', ctx, now, options).items).toEqual([]);
  });
  it('uses the unchanged frozen policy fixture in the adapter, including denied-source safety', () => {
    expect(runBaseline(inputs.cases.find(item => item.id === 'RU21')!, inputs.corpus).ids).toEqual([]);
  });
  it('cannot invoke a provider through this pure gate', () => {
    const fetcher = vi.fn(() => { throw new Error('NETWORK_FORBIDDEN'); });
    vi.stubGlobal('fetch', fetcher);
    try { retrieveAuthorizedEventEvidence(feed(), 'События', ctx, now, { resolveSourcePolicy: () => allowed }); expect(fetcher).not.toHaveBeenCalled(); }
    finally { vi.unstubAllGlobals(); }
  });
});
