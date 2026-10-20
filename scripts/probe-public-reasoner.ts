/** Manual owner-only diagnostic: one existing durable reservation, fixed public
 * query, no personal history/location. Never run automatically or log keys.
 * Provider output is printed ONLY for this controlled non-personal request.
 */
import { initializeVpsRuntime } from '../src/server/vps/runtime';
import { answerReasonedAssistant } from '../src/server/pilot/reasoned-assistant';
import { answerPilotChatWithEvents } from '../src/server/pilot/chat';
import { pilotContextSchema } from '../src/server/pilot/contracts';
async function main() {
  if (process.argv[2] !== '--one-approved-call') throw Error('EXPLICIT_APPROVED_CALL_REQUIRED');
  const runtime = initializeVpsRuntime();
  try {
    const context = pilotContextSchema.parse({ goal: 'activity', budget: null, minutes: 120 });
    const text = 'Помоги выбрать лекцию в Астане.';
    const dependencies = runtime.ai.dependencies(crypto.randomUUID(), crypto.randomUUID());
    const result = await answerReasonedAssistant({ text, context, history: [], language: 'ru' }, { ...dependencies,
      fetcher: async (url, init) => {
        const response = await fetch(url, init);
        const provider = await response.clone().json() as { output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> };
        console.log('CONTROLLED_PUBLIC_QUERY_OUTPUT', JSON.stringify(provider.output?.filter(item => item.type === 'message').flatMap(item => item.content ?? []).filter(part => part.type === 'output_text').map(part => part.text)));
        return response;
      },
    }, async plan => {
      const result = await answerPilotChatWithEvents(text, context, { getEvents: runtime.events.get, forceEvents: true, semanticText: plan.query });
      const allowed = result.events.filter(event => runtime.events.canSendToLlm?.(event.provenance.sourceId));
      return { reply: allowed.length === result.events.length ? result.reply : 'Уточните интересующий формат.', items: [], events: allowed,
        eventEvidence: result.eventEvidence.filter(record => allowed.some(event => event.id === record.eventId)) };
    });
    console.log('CONTROLLED_RESULT', JSON.stringify({ mode: result.assistant.mode, reason: result.assistant.reason, citations: result.assistant.citations.length }));
  } finally { runtime.close(); }
}
main().catch(() => { console.error('CONTROLLED_PROBE_FAILED'); process.exitCode = 1; });
