import { z } from 'zod';

const id = z.string().min(1).max(256);
export const goldenSchema = z.object({
  schemaVersion: z.literal(1), id, split: z.enum(['dev', 'holdout']), familyId: id,
  language: z.enum(['ru', 'kk', 'en']), text: z.string().min(1).max(1000),
  engine: z.enum(['places', 'events', 'dialogue', 'plan']), track: z.enum(['snapshot', 'synthetic_test']),
  corpusVersion: id, frozenNow: z.string().datetime(), recordIds: z.array(id),
  judgments: z.record(id, z.number().int().min(0).max(3)), unjudgedIds: z.array(id),
  context: z.record(z.string(), z.unknown()), expectedOutcome: z.enum(['feasible', 'infeasible', 'uncertain', 'empty', 'clarify']),
  requiredUnknowns: z.array(id), forbiddenIds: z.array(id), forbiddenClaims: z.array(id),
  annotation: z.object({ status: z.enum(['proposed_requires_independent_review', 'reviewed', 'disputed']), method: z.string(), rationale: z.string().min(1),
    evidenceRefs: z.array(z.object({ entityId: id, sourceUrl: z.string().url(), fields: z.array(z.string()).min(1), judgmentReason: z.string().min(1) })) }),
  expectedContext: z.record(z.string(), z.unknown()).optional(), feedMode: z.enum(['snapshot', 'unavailable']).optional(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string() })).optional(),
  stopIds: z.array(id).optional(), expectedOrder: z.array(id).optional(), dialogueCheck: z.string().optional(),
  expectedPlan: z.object({ visitMinutes: z.number().nullable(), travelMinutes: z.number().nullable(),
    bufferMinutes: z.number(), totalMinutes: z.number().nullable(), remainingMinutes: z.number().nullable() }).strict().optional(),
}).strict();
export type GoldenCase = z.infer<typeof goldenSchema>;

export function validateGolden(cases: GoldenCase[], corpusIds: Set<string>, version: string) {
  if (cases.length !== 40) throw new Error('GOLD_CASE_COUNT');
  const seen = new Set<string>(), families = new Map<string, string>();
  const counts = { ru: 0, kk: 0, en: 0 };
  for (const raw of cases) {
    const c = goldenSchema.parse(raw);
    if (seen.has(c.id)) throw new Error('GOLD_DUPLICATE_ID'); seen.add(c.id); counts[c.language]++;
    if (families.has(c.familyId) && families.get(c.familyId) !== c.split) throw new Error('GOLD_FAMILY_LEAKAGE');
    families.set(c.familyId, c.split);
    if (c.corpusVersion !== version || !Number.isFinite(Date.parse(c.frozenNow))) throw new Error('GOLD_VERSION_CLOCK');
    if (new Set(c.recordIds).size !== c.recordIds.length || c.recordIds.some(value => !corpusIds.has(value))) throw new Error('GOLD_POOL_ID');
    const judged = Object.keys(c.judgments), unjudged = new Set(c.unjudgedIds);
    if (judged.some(value => !c.recordIds.includes(value) || unjudged.has(value))
      || c.unjudgedIds.some(value => !c.recordIds.includes(value))
      || c.recordIds.some(value => !Object.hasOwn(c.judgments, value) && !unjudged.has(value))) throw new Error('GOLD_POOL_INCOMPLETE');
    if (c.forbiddenIds.some(value => !c.recordIds.includes(value))) throw new Error('GOLD_FORBIDDEN_ID');
    if (c.recordIds.some(value => !c.annotation.evidenceRefs.some(ref => ref.entityId === value))) throw new Error('GOLD_EVIDENCE_MISSING');
  }
  if (counts.ru !== 24 || counts.kk !== 8 || counts.en !== 8) throw new Error('GOLD_LANGUAGE_COUNTS');
}
