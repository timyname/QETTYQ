import { catalogMeta } from "../../../server/pilot/catalog";
import { answerPilotChatWithEvents } from "../../../server/pilot/chat";
import { liveEventsService } from "../../../server/ingestion/live-events";
import { chatInputSchema, pilotContextSchema } from "../../../server/pilot/contracts";
import { apiError, blockCrossSiteMutation, jsonResponse, readJson, requireSession, validationError } from "../../../server/session/http";

export async function POST(request: Request) {
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
  const meta = catalogMeta();
  return jsonResponse({ ...meta, ...result, dataMode: result.eventsMeta?.dataMode ?? meta.dataMode, warnings: [...(result.eventsMeta ? [] : meta.warnings), ...result.warnings] });
}
