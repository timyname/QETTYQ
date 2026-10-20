import { catalogMeta } from "../../../server/pilot/catalog";
import { answerPilotChatWithEvents } from "../../../server/pilot/chat";
import { liveEventsService } from "../../../server/ingestion/live-events";
import { answerSmartAssistant, type SmartAssistantResult } from "../../../server/pilot/smart-assistant";
import { getLocalAITestGate, reserveLocalAITestCall } from "../../../server/pilot/ai-test-quota";
import type { PublicAIRuntime } from "../../../server/pilot/public-ai-runtime";
import { chatInputSchema, pilotContextSchema } from "../../../server/pilot/contracts";
import { apiError, blockCrossSiteMutation, jsonResponse, readJson, requireSession, validationError } from "../../../server/session/http";

export async function handleChat(request: Request, publicRuntime?: PublicAIRuntime) {
  const blocked = blockCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = chatInputSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);
  const now = Date.now();
  auth.session.chatRequestTimes = auth.session.chatRequestTimes.filter((time) => time > now - 60_000);
  if (auth.session.chatRequestTimes.length >= 30) return apiError("RATE_LIMITED", 429);
  auth.session.chatRequestTimes.push(now);
  const context = parsed.data.context ?? auth.session.context ?? pilotContextSchema.parse({});
  const result = await answerPilotChatWithEvents(parsed.data.text, context, { getEvents: () => liveEventsService.get() });
  let assistant: SmartAssistantResult = { mode: "deterministic", reply: result.reply, citations: [], model: null, reason: "AI_NOT_REQUESTED" };
  if (parsed.data.useAI) {
    const input = { text: parsed.data.text, history: parsed.data.history, context: result.proposedContext,
      evidence: { items: result.items, events: result.events, eventEvidence: result.eventEvidence, reply: result.reply } };
    if (publicRuntime) {
      assistant = await answerSmartAssistant(input, publicRuntime.dependencies(auth.session.id, request.headers.get('idempotency-key') ?? crypto.randomUUID()));
    } else {
      const gate = getLocalAITestGate(request);
      assistant = gate.allowed
        ? await answerSmartAssistant(input, { executionScope: "local_test", quota: { reserve: () => reserveLocalAITestCall(request) } })
        : { ...assistant, reason: gate.reason };
    }
  }
  const meta = catalogMeta();
  const warnings = assistant.mode === "openai"
    ? result.warnings.filter(warning => !warning.startsWith("Без внешнего AI:"))
    : result.warnings;
  return jsonResponse({ ...meta, ...result, ...assistant, generationMode: assistant.mode,
    dataMode: result.eventsMeta?.dataMode ?? meta.dataMode, warnings: [...(result.eventsMeta ? [] : meta.warnings), ...warnings] });
}

export function POST(request: Request) { return handleChat(request); }
