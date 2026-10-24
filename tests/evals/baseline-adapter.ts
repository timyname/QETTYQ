import { prepareLeisureDialogue } from '../../src/server/assistant/leisure-dialogue';
import { retrieveAuthorizedEventEvidence } from '../../src/server/retrieval/service';
import type { RetrievalSourcePolicy } from '../../src/server/retrieval/source-permission';
import type { LiveAstanaEvent } from '../../src/server/ingestion/sxodim-live';
import { parseContext, answerPilotChat } from '../../src/server/pilot/chat';
import { searchPilotPlaces, publicPlaceAt } from '../../src/server/pilot/catalog';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import { calculateMixedPlan, type PlanStop } from '../../src/server/pilot/plans';
import { eventPlanStop } from '../../src/server/pilot/event-plan-stop';
import type { Place } from '../../src/domain/types';
import type { GoldenCase } from './schema';

export type EvalCorpus = {
  schemaVersion: number; corpusVersion: string; frozenNow: string; provenance: unknown;
  places: Place[]; events: LiveAstanaEvent[]; syntheticPlaces: Place[]; syntheticEvents: LiveAstanaEvent[];
  sourcePolicies: Record<string, RetrievalSourcePolicy>;
};
export type BaselineResult = { ids: string[]; outcome: 'feasible' | 'infeasible' | 'uncertain' | 'empty' | 'clarify';
  unknowns: string[]; assertions: string[]; actualContext: Record<string, unknown>; planSummary?: GoldenCase['expectedPlan'] };

/** Existing functions only. No matcher copy, source fetch, provider, database, or production writes. */
export function runBaseline(c: GoldenCase, corpus: EvalCorpus): BaselineResult {
  const now = Date.parse(c.frozenNow), context = parseContext(c.text, pilotContextSchema.parse(c.context));
  const places = [...corpus.places, ...corpus.syntheticPlaces].filter(p => c.recordIds.includes(p.id));
  const events = [...corpus.events, ...corpus.syntheticEvents].filter(e => c.recordIds.includes(e.id));
  if (c.engine === 'places') {
    const results = searchPilotPlaces(context, c.text, places, now);
    const unknowns = results.flatMap(p => p.unknowns);
    return { ids: results.map(p => p.id), outcome: results.length ? 'uncertain' : 'empty', unknowns,
      assertions: [], actualContext: context };
  }
  if (c.engine === 'events') {
    const result = retrieveAuthorizedEventEvidence({ items: events, dataMode: c.feedMode === 'unavailable' ? 'unavailable' : 'snapshot',
      freshness: c.feedMode === 'unavailable' ? 'unavailable' : c.track === 'snapshot' ? 'stale' : 'fresh',
      cacheStatus: 'hit', fetchedAt: c.track === 'snapshot' ? '2026-10-20T11:02:28.509Z' : '2026-10-21T06:50:00Z',
      expiresAt: c.track === 'snapshot' ? '2026-10-20T12:02:28.509Z' : '2026-10-21T07:50:00Z', source: null, coverage: null, warnings: [] },
    c.text, context, now, { resolveSourcePolicy: id => corpus.sourcePolicies[id] });
    return { ids: result.items.map(e => e.id), outcome: result.items.length ? 'uncertain' : 'empty',
      unknowns: result.evidence.flatMap(e => e.unknowns), assertions: [], actualContext: context };
  }
  if (c.engine === 'plan') {
    const stops = (c.stopIds ?? []).map(id => {
      const p = places.find(place => place.id === id);
      if (p) return publicPlaceAt(p, now) as PlanStop;
      const event = events.find(value => value.id === id), stop = event ? eventPlanStop(event, now) : null;
      if (!stop) throw new Error('EVAL_PLAN_STOP_UNAVAILABLE'); return stop;
    });
    const plan = calculateMixedPlan(stops, context);
    const assertions = c.expectedOrder && JSON.stringify(plan.placeIds) !== JSON.stringify(c.expectedOrder) ? ['PLAN_ORDER_CHANGED'] : [];
    const planSummary = { visitMinutes: plan.visitMinutes, travelMinutes: plan.travelMinutes, bufferMinutes: plan.bufferMinutes,
      totalMinutes: plan.totalMinutes, remainingMinutes: plan.remainingMinutes };
    for (const [field, value] of Object.entries(c.expectedPlan ?? {})) {
      if (planSummary[field as keyof typeof planSummary] !== value) assertions.push(`PLAN_ARITHMETIC:${field}`);
    }
    return { ids: plan.placeIds, outcome: plan.feasibility, unknowns: plan.totalMinutes === null ? ['total_duration'] : [],
      assertions, actualContext: context, planSummary };
  }
  const dialogue = prepareLeisureDialogue({ text: c.text, history: c.history ?? [], language: c.language, context, now });
  const assertions: string[] = [];
  if (c.dialogueCheck === 'retained_ballet_exclusion' && !dialogue.excludedTags.includes('ballet')) assertions.push('EXCLUSION_LOST');
  if (c.dialogueCheck === 'reset_preserves_settings' && (!dialogue.reset || dialogue.context.budget !== 2000 || !dialogue.context.strictBudget)) assertions.push('SETTINGS_RESET');
  if (c.dialogueCheck === 'cinema_unavailable') {
    const answer = answerPilotChat(c.text, context);
    return { ids: answer.items.map(p => p.id), outcome: answer.items.length ? 'uncertain' : 'empty', unknowns: [], assertions, actualContext: answer.proposedContext };
  }
  return { ids: [], outcome: dialogue.action === 'clarify' ? 'clarify' : 'uncertain', unknowns: [], assertions, actualContext: dialogue.context };
}
