import { RAG_TRACE_VERSION, type RagTrace, type RagTraceStore } from './trace';

type Stage = Exclude<keyof RagTrace['stages'], 'total'>;
type Result = { items?: { id: string }[]; events?: { id: string }[];
  mode?: string; dataMode?: string; eventsMeta?: { dataMode?: string } | null };
/** No input query/history/context enters this recorder. All unexpected fields
 * are omitted, selected public IDs are hashed, and failures never affect chat. */
export function beginRagTrace(sessionId: string, language: RagTrace['language'], store?: RagTraceStore, clock = Date.now) {
  const started = clock(), id = crypto.randomUUID();
  const stages = { memory: 0, dialogue: 0, retrieval: 0, generation: 0, total: 0 };
  let last = started, finished = false, historyCount = 0;
  const duration = (from: number, to: number) => Math.min(600000, Math.max(0, to - from));
  return {
    history(count: number) { historyCount = Math.min(20, Math.max(0, count)); },
    mark(stage: Stage) { const now = clock(); stages[stage] += duration(last, now); last = now; },
    async finish(outcome: RagTrace['outcome'], result: Result = {}, excluded: number | null = null): Promise<string | null> {
      if (finished) return null;
      finished = true;
      if (!store) return null;
      try {
        const ids = [...(result.items ?? []), ...(result.events ?? [])].slice(0, 6).map(item => item.id);
        const hashes = await Promise.all(ids.map(async id => {
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`qettyq-public-entity-v1:${id}`));
          return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
        }));
        const mode = result.eventsMeta?.dataMode ?? result.dataMode;
        const trace: RagTrace = { version: RAG_TRACE_VERSION, requestId: id, createdAtMs: started,
          versions: { corpus: 'osm-astana-20261019_sxodim-hourly', query: 'multilingual-lexical-v2',
            dialogue: 'leisure-dialogue-v2', index: 'none', generation: 'existing-bounded-plan-answer-v1' },
          language, outcome, generationMode: outcome === 'error' ? 'not_executed' : result.mode === 'openai' ? 'openai' : 'deterministic',
          dataMode: outcome === 'clarify' || outcome === 'error' ? 'not_retrieved'
            : mode === 'live' || mode === 'snapshot' || mode === 'unavailable' ? mode : 'snapshot',
          reason: outcome === 'clarify' ? 'clarification' : outcome === 'error' ? 'pipeline_error' : outcome === 'empty' ? 'no_match' : 'matched',
          counts: { history: historyCount, places: result.items?.length ?? 0, events: result.events?.length ?? 0, excluded },
          selectedEntityHashes: hashes, stages: { ...stages, total: duration(started, clock()) },
          accounting: 'not_collected_use_existing_budget_ledger' };
        return store.write(sessionId, trace) ? id : null;
      } catch { return null; }
    },
  };
}
