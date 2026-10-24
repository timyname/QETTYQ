import type { PilotContext } from '../pilot/contracts';
import { retrieveEventEvidence, type EventRetrieval } from '../ingestion/event-evidence';
import type { LiveEventsResult } from '../ingestion/live-events';
import { sourcePermission, type SourcePolicyResolver, type SourceUse } from './source-permission';

/** Source scope is checked before lexical matching/ranking/top-K. No policy cache,
 * provider call, new facts or widening of the existing money/time/date rules. */
export function retrieveAuthorizedEventEvidence(data: LiveEventsResult, text: string, context: PilotContext,
  now: number, options: { resolveSourcePolicy: SourcePolicyResolver; use?: SourceUse; semanticText?: string }): EventRetrieval {
  const denied: EventRetrieval['excluded'] = [];
  const items = data.items.filter(event => {
    const decision = sourcePermission(event.provenance.sourceId, options.use ?? 'display', options.resolveSourcePolicy, now);
    if (decision.allowed) return true;
    denied.push({ eventId: event.id, reason: decision.reason });
    return false;
  });
  const result = retrieveEventEvidence({ ...data, items }, text, context, now, { semanticText: options.semanticText });
  return { ...result, excluded: [...denied, ...result.excluded] };
}
