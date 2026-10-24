import { z } from 'zod';

// Technical diagnostics only. No query, transcript, coordinates, addresses,
// arbitrary reason strings, URLs or provider output are accepted by this schema.
export const RAG_TRACE_VERSION = 'rag-trace-v1';
export const RAG_TRACE_TTL_MS = 24 * 60 * 60 * 1000;
const count = z.number().int().min(0).max(10000);
const timing = z.number().finite().min(0).max(600000);
export const ragTraceSchema = z.object({
  version: z.literal(RAG_TRACE_VERSION), requestId: z.string().uuid(),
  createdAtMs: z.number().int().nonnegative(),
  versions: z.object({ corpus: z.literal('osm-astana-20261019_sxodim-hourly'),
    query: z.enum(['multilingual-lexical-v2', 'multilingual-lexical-v3']), dialogue: z.enum(['leisure-dialogue-v2', 'leisure-dialogue-v3']),
    index: z.literal('none'), generation: z.literal('existing-bounded-plan-answer-v1') }).strict(),
  language: z.enum(['ru', 'kk', 'en']), outcome: z.enum(['success', 'empty', 'clarify', 'error']),
  generationMode: z.enum(['openai', 'deterministic', 'not_executed']),
  dataMode: z.enum(['live', 'snapshot', 'unavailable', 'not_retrieved']),
  reason: z.enum(['clarification', 'matched', 'no_match', 'pipeline_error']),
  counts: z.object({ history: count, places: count, events: count,
    excluded: count.nullable() }).strict(),
  // Hash public entity IDs; even debug payload cannot carry crafted provider text.
  selectedEntityHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/u)).max(6),
  stages: z.object({ memory: timing, dialogue: timing, retrieval: timing,
    generation: timing, total: timing }).strict(),
  accounting: z.literal('not_collected_use_existing_budget_ledger'),
}).strict();
export type RagTrace = z.infer<typeof ragTraceSchema>;
export type RagTraceStore = {
  write(sessionId: string, trace: RagTrace): boolean;
  read(sessionId: string, requestId: string): RagTrace | null;
  deleteSession(sessionId: string): void;
  purge(): void;
  dispose?(): void;
};
