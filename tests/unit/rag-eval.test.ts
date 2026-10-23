import { describe, expect, it, vi } from 'vitest';
import { loadEvalInputs, evaluate, summarize, verifyEvalHashes } from '../evals/evaluate';
import { retrievalMetrics } from '../evals/metrics';
import { validateGolden } from '../evals/schema';
import { runBaseline } from '../evals/baseline-adapter';

const inputs = loadEvalInputs();
const corpusIds = new Set([...inputs.corpus.places, ...inputs.corpus.events,
  ...inputs.corpus.syntheticPlaces, ...inputs.corpus.syntheticEvents].map(value => value.id));

describe('offline RAG evaluation harness, not a new retrieval algorithm', () => {
  it('validates all 40 fully judged cases and the required language/family split', () => {
    expect(inputs.cases).toHaveLength(40);
    expect(inputs.cases.filter(c => c.language === 'ru')).toHaveLength(24);
    expect(inputs.cases.filter(c => c.language === 'kk')).toHaveLength(8);
    expect(inputs.cases.filter(c => c.language === 'en')).toHaveLength(8);
    expect(inputs.cases.filter(c => c.split === 'dev')).toHaveLength(24);
    expect(inputs.cases.filter(c => c.split === 'holdout')).toHaveLength(16);
    expect(() => validateGolden(inputs.cases, corpusIds, inputs.corpus.corpusVersion)).not.toThrow();
  });
  it('rejects translation-family train/holdout leakage', () => {
    const changed = structuredClone(inputs.cases);
    changed.find(c => c.id === 'EN01')!.split = 'holdout';
    expect(() => validateGolden(changed, corpusIds, inputs.corpus.corpusVersion)).toThrow('GOLD_FAMILY_LEAKAGE');
  });
  it('fails closed if a frozen fixture changes without its manifest', () => {
    expect(() => verifyEvalHashes({ ...inputs.hashes, corpus: 'changed' }, inputs.hashes)).toThrow('EVAL_FIXTURE_HASH_MISMATCH');
  });
  it('rejects unknown IDs and incomplete judgment coverage', () => {
    const missing = structuredClone(inputs.cases); missing[0].recordIds.push('not-in-corpus');
    expect(() => validateGolden(missing, corpusIds, inputs.corpus.corpusVersion)).toThrow('GOLD_POOL_ID');
    const incomplete = structuredClone(inputs.cases); delete incomplete[0].judgments[incomplete[0].recordIds[0]];
    expect(() => validateGolden(incomplete, corpusIds, inputs.corpus.corpusVersion)).toThrow('GOLD_POOL_INCOMPLETE');
  });
  it('does not count unjudged as irrelevant or empty gold as perfect recall', () => {
    expect(retrievalMetrics(['missing'], { yes: 3 }).returnedRecallAt10).toBeNull();
    expect(retrievalMetrics([], { no: 0 }).returnedRecallAt10).toBeNull();
    expect(retrievalMetrics([], { yes: 3 }).returnedRecallAt10).toBe(0);
  });
  it('computes graded rank and deduplicated returned recall correctly', () => {
    const metric = retrievalMetrics(['weak', 'strong', 'strong'], { strong: 3, weak: 1 });
    expect(metric.returnedRecallAt10).toBe(1);
    expect(metric.ndcgAt3).toBeLessThan(1);
    expect(retrievalMetrics(['strong', 'weak'], { strong: 3, weak: 1 }).ndcgAt3).toBe(1);
  });
  it('uses original frozen event timestamps and distinguishes snapshot/synthetic', () => {
    expect(inputs.corpus.events).toHaveLength(7);
    expect(inputs.corpus.places).toHaveLength(24);
    expect(inputs.corpus.syntheticEvents.every(e => e.id.startsWith('synthetic:'))).toBe(true);
    expect(inputs.corpus.events.every(e => e.fetchedAt.startsWith('2026-10-20'))).toBe(true);
  });
  it('is deterministic excluding timings and preserves inputs', () => {
    const before = JSON.stringify(inputs), strip = (rows: ReturnType<typeof evaluate>) => rows.map(({ milliseconds: _ms, ...row }) => { void _ms; return row; });
    expect(strip(evaluate(inputs.cases, inputs.corpus))).toEqual(strip(evaluate(inputs.cases, inputs.corpus)));
    expect(JSON.stringify(inputs)).toBe(before);
  });
  it('does not make a network request and restores the caller fetch function', () => {
    const fetcher = vi.fn(() => { throw new Error('NO_NETWORK_ALLOWED'); });
    const original = globalThis.fetch; globalThis.fetch = fetcher as unknown as typeof fetch;
    try { evaluate(inputs.cases, inputs.corpus); expect(fetcher).not.toHaveBeenCalled(); expect(globalThis.fetch).toBe(fetcher); }
    finally { globalThis.fetch = original; }
  });
  it('passes the frozen clock to public POI projection instead of the wall clock', () => {
    const c = inputs.cases.find(c => c.id === 'RU02')!;
    const a = runBaseline(c, inputs.corpus);
    vi.useFakeTimers(); vi.setSystemTime('2031-12-01T00:00:00Z');
    try { expect(runBaseline(c, inputs.corpus)).toEqual(a); } finally { vi.useRealTimers(); }
  });
  it('reports observed boundaries without pretending candidate recall or generation was tested', () => {
    const rows = evaluate(inputs.cases, inputs.corpus), summary = summarize(rows);
    expect(summary.overall.candidateRecallAt10).toBe('not_observable_existing_top3_boundary');
    expect(rows.every(r => r.generationClaimsEvaluation === 'not_executed_no_generator')).toBe(true);
    expect(summary.byLanguage.ru.cases).toBe(24);
    expect(summary.overall.returnedRecallAt10.denominator).toBeGreaterThan(0);
  });
  it('does not prefill group extraction answers and detects a one-minute plan error', () => {
    for (const c of inputs.cases.filter(c => c.familyId === 'group')) {
      expect(c.context).not.toHaveProperty('budget'); expect(c.context).not.toHaveProperty('budgetBasis'); expect(c.context).not.toHaveProperty('partySize');
    }
    const c = structuredClone(inputs.cases.find(c => c.id === 'RU19')!);
    expect(c.expectedPlan).toEqual({ visitMinutes: 60, travelMinutes: 0, bufferMinutes: 18, totalMinutes: 78, remainingMinutes: 42 });
    expect(runBaseline(c, inputs.corpus).assertions).toEqual([]);
    c.expectedPlan!.totalMinutes = 79;
    expect(runBaseline(c, inputs.corpus).assertions).toContain('PLAN_ARITHMETIC:totalMinutes');
  });
});
