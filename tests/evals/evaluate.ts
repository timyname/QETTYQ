import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { goldenSchema, validateGolden, type GoldenCase } from './schema';
import { runBaseline, type EvalCorpus } from './baseline-adapter';
import { average, percentile, retrievalMetrics } from './metrics';

export function verifyEvalHashes(hashes: { corpus: string; golden: string }, expected: { corpus: string; golden: string }) {
  if (hashes.corpus !== expected.corpus || hashes.golden !== expected.golden) throw new Error('EVAL_FIXTURE_HASH_MISMATCH');
}

export function loadEvalInputs() {
  const corpusBytes = readFileSync(new URL('./fixtures/corpus-v1.json', import.meta.url));
  const goldBytes = readFileSync(new URL('./rag-golden.jsonl', import.meta.url));
  const corpus = JSON.parse(corpusBytes.toString('utf8')) as EvalCorpus;
  const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8')) as { corpusVersion: string; frozenNow: string; hashes: { corpus: string; golden: string } };
  const hashes = { corpus: createHash('sha256').update(corpusBytes).digest('hex'), golden: createHash('sha256').update(goldBytes).digest('hex') };
  verifyEvalHashes(hashes, manifest.hashes);
  if (manifest.corpusVersion !== corpus.corpusVersion || manifest.frozenNow !== corpus.frozenNow) throw new Error('EVAL_MANIFEST_VERSION');
  const cases = goldBytes.toString('utf8').trim().split('\n').map(line => goldenSchema.parse(JSON.parse(line)));
  const ids = [...corpus.places, ...corpus.syntheticPlaces, ...corpus.events, ...corpus.syntheticEvents].map(item => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('CORPUS_DUPLICATE_ID');
  validateGolden(cases, new Set(ids), corpus.corpusVersion);
  if (cases.some(c => c.frozenNow !== corpus.frozenNow)) throw new Error('EVAL_CASE_CLOCK_MISMATCH');
  return { corpus, cases, hashes };
}

export function evaluate(cases: GoldenCase[], corpus: EvalCorpus) {
  const priorFetch = globalThis.fetch;
  globalThis.fetch = (() => { throw new Error('EVAL_NETWORK_FORBIDDEN'); }) as typeof fetch;
  try {
    return cases.map(c => {
      const start = performance.now(), actual = runBaseline(c, corpus), milliseconds = performance.now() - start;
      const failures = [...actual.assertions];
      if (actual.outcome !== c.expectedOutcome) failures.push(`OUTCOME:${actual.outcome}!=${c.expectedOutcome}`);
      const forbiddenReturned = actual.ids.filter(id => c.forbiddenIds.includes(id));
      if (forbiddenReturned.length) failures.push(`FORBIDDEN_IDS:${forbiddenReturned.join(',')}`);
      const missingUnknowns = c.requiredUnknowns.filter(value => !actual.unknowns.includes(value));
      if (missingUnknowns.length) failures.push(`MISSING_UNKNOWNS:${missingUnknowns.join(',')}`);
      for (const [key, expected] of Object.entries(c.expectedContext ?? {})) {
        if (JSON.stringify(actual.actualContext[key]) !== JSON.stringify(expected)) failures.push(`CONTEXT:${key}`);
      }
      const metric = ['places', 'events'].includes(c.engine) ? retrievalMetrics(actual.ids, c.judgments) : null;
      if (metric?.unjudged.length) failures.push('UNJUDGED_RETURNED');
      return { id: c.id, split: c.split, familyId: c.familyId, language: c.language, track: c.track, engine: c.engine,
        returnedIds: actual.ids, outcome: actual.outcome, expectedOutcome: c.expectedOutcome, failures,
        ...(actual.planSummary ? { planSummary: actual.planSummary } : {}),
        forbiddenReturned, missingUnknowns, metric, milliseconds, annotationStatus: c.annotation.status,
        generationClaimsEvaluation: 'not_executed_no_generator' as const };
    });
  } finally { globalThis.fetch = priorFetch; }
}

export function summarize(rows: ReturnType<typeof evaluate>) {
  const group = (selected: typeof rows) => ({ cases: selected.length, outcomeCorrect: selected.filter(r => r.outcome === r.expectedOutcome).length,
    assertionPass: selected.filter(r => !r.failures.length).length,
    forbiddenReturned: selected.reduce((sum, r) => sum + r.forbiddenReturned.length, 0),
    returnedRecallAt10: average(selected.map(r => r.metric?.returnedRecallAt10 ?? null)),
    ndcgAt3: average(selected.map(r => r.metric?.ndcgAt3 ?? null)),
    candidateRecallAt10: 'not_observable_existing_top3_boundary',
    p50Milliseconds: percentile(selected.map(r => r.milliseconds), .5), p95Milliseconds: percentile(selected.map(r => r.milliseconds), .95) });
  return { overall: group(rows), byLanguage: Object.fromEntries(['ru', 'kk', 'en'].map(l => [l, group(rows.filter(r => r.language === l))])),
    byTrack: Object.fromEntries(['snapshot', 'synthetic_test'].map(t => [t, group(rows.filter(r => r.track === t))])),
    bySplit: Object.fromEntries(['dev', 'holdout'].map(s => [s, group(rows.filter(r => r.split === s))])),
    byEngine: Object.fromEntries(['places', 'events', 'dialogue', 'plan'].map(e => [e, group(rows.filter(r => r.engine === e))])) };
}
