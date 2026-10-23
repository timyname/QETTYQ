import { catalogMeta } from "../../../server/pilot/catalog";
import { prepareLeisureDialogue, filterDialogueCandidates, DIALOGUE_CONFIRMED_FIELDS } from "../../../server/assistant/leisure-dialogue";
import { answerPilotChatWithEvents, parseContext, positiveCategoryQuery } from "../../../server/pilot/chat";
import { answerReasonedAssistant } from "../../../server/pilot/reasoned-assistant";
import { localizedClarification, localizedSearchReply } from "../../../server/pilot/chat-language";
import { requestedFoodMatch } from "../../../server/pilot/food-search";
import { getGooglePlacesRuntime, unavailableGooglePlaces, type GooglePlacesResult } from "../../../server/pilot/google-places";
import { pilotPlaces, searchPilotPlaces } from "../../../server/pilot/catalog";
import type { MemoryAIContext, MemoryDialogueContext } from "../../../server/memory/contracts";
import { liveEventsService } from "../../../server/ingestion/live-events";
import { answerSmartAssistant, type SmartAssistantResult } from "../../../server/pilot/smart-assistant";
import { getLocalAITestGate, reserveLocalAITestCall } from "../../../server/pilot/ai-test-quota";
import type { PublicAIRuntime } from "../../../server/pilot/public-ai-runtime";
import { getHostedRuntime, type HostedRuntime } from "../../../server/pilot/host-runtime";
import { boundChatPayload } from "../../../server/pilot/chat-history";
import { chatInputSchema, pilotContextSchema } from "../../../server/pilot/contracts";
import { apiError, blockCrossSiteMutation, jsonResponse, readJson, requireSession, validationError } from "../../../server/session/http";
import { beginRagTrace } from "../../../server/retrieval/trace-recorder";
import type { RagTraceStore } from "../../../server/retrieval/trace";

export async function handleChat(request: Request, publicRuntime?: PublicAIRuntime, events: HostedRuntime["events"] = liveEventsService, memory?: HostedRuntime["memory"], traces: RagTraceStore | undefined = getHostedRuntime()?.ragTraces) {
  const blocked = blockCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  let payload = body.value;
  if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
    try { payload = boundChatPayload(payload as Record<string, unknown> & { history?: unknown }); }
    catch { return apiError("PAYLOAD_TOO_LARGE", 413); }
  }
  const parsed = chatInputSchema.safeParse(payload);
  if (!parsed.success) return validationError(parsed.error);
  const now = Date.now();
  auth.session.chatRequestTimes = auth.session.chatRequestTimes.filter((time) => time > now - 60_000);
  if (auth.session.chatRequestTimes.length >= 30) return apiError("RATE_LIMITED", 429);
  auth.session.chatRequestTimes.push(now);
  const trace = beginRagTrace(auth.session.id, parsed.data.language, traces);
  try {
  // Availability is checked before choosing a memory scope. If public AI cannot
  // run, use a strictly local path even when the UI requested AI; never read a
  // local-only transcript and then attempt a model if quota changes mid-request.
  let aiGate: { available: boolean; reason: string | null } | null = null;
  if (parsed.data.useAI && publicRuntime) {
    try { aiGate = await publicRuntime.getStatus(auth.session.id); }
    catch { aiGate = { available: false, reason: "PUBLIC_BUDGET_STORAGE_UNAVAILABLE" }; }
  }
  const executeAI = parsed.data.useAI && aiGate?.available !== false;
  let saved: MemoryAIContext | null = null;
  if (executeAI && memory) { try { saved = await memory.readForAI(request); } catch { /* no hidden RAM/consent fallback */ } }
  let localSaved: MemoryDialogueContext | null = null;
  if (!executeAI && memory?.readForDialogue) {
    try { localSaved = await memory.readForDialogue(request); } catch { /* local scope also fails closed */ }
  }
  const preferences = saved?.preferences ?? localSaved?.preferences;
  const context = parsed.data.context ?? auth.session.context ?? pilotContextSchema.parse(preferences ? {
    likedTags: preferences.likedTags, goal: preferences.goal, minutes: preferences.minutes, budget: preferences.budget,
  } : {});
  // Prefer the current bounded transcript. Global text deduplication can erase a
  // later correction (e.g. 2000 -> 3000 -> 2000); never treat assistant text as fact.
  const history = (parsed.data.history.length ? parsed.data.history : saved?.history ?? localSaved?.history ?? []).slice(-20);
  // Local history/profile consent is NOT permission to send a derived query to
  // Google. Current explicit context/transcript wins; never silently widen the
  // local-only grant when restored information participates in this request.
  const localMemoryUsed = localSaved !== null && (parsed.data.history.length === 0 && history.length > 0
    || !parsed.data.context && !auth.session.context && localSaved.preferences !== null);
  trace.history(history.length);
  trace.mark("memory");
  // Only /api/context establishes confirmed settings. A default request context
  // or a remembered preference is not silently promoted to a locked constraint.
  const defaultContext = pilotContextSchema.parse({});
  const budgetFields = new Set(["budget", "strictBudget", "budgetBasis", "partySize"]);
  const confirmedFields = auth.session.context ? DIALOGUE_CONFIRMED_FIELDS.filter(field => field !== "goal"
    && auth.session.context![field] === context[field])
    : localMemoryUsed && parsed.data.context ? DIALOGUE_CONFIRMED_FIELDS.filter(field => field !== "goal"
      && (context[field] !== defaultContext[field] || context.budget !== null && budgetFields.has(field))) : undefined;
  const dialogue = prepareLeisureDialogue({ text: parsed.data.text, history, context, confirmedFields, language: parsed.data.language, now });
  trace.mark("dialogue");
  const remember = async (reply: string, mode: "openai" | "deterministic") => {
    if (!memory) return false;
    try { return (await memory.recordExchange(request, { userMessageId: crypto.randomUUID(), userText: parsed.data.text,
      assistantMessageId: crypto.randomUUID(), assistantText: reply, mode })).stored; }
    catch { return false; }
  };
  if (dialogue.action === "clarify") {
    const traceId = await trace.finish("clarify", { mode: "deterministic" });
    return jsonResponse({ ...catalogMeta(), reply: dialogue.reply, proposedContext: dialogue.context,
      items: [], events: [], eventEvidence: [], eventsMeta: null, citations: [], steps: [], suggestions: [],
      mode: "deterministic", generationMode: "deterministic", reasoningMode: "deterministic", model: null,
      reason: "DIALOGUE_CLARIFICATION", questions: dialogue.questions, warnings: dialogue.warnings,
      memoryStored: await remember(dialogue.reply, "deterministic"), language: parsed.data.language }, 200,
      traceId ? { "x-qettyq-trace-id": traceId } : undefined);
  }
  const retrievalText = dialogue.retrievalText, effectiveContext = dialogue.context;
  let result = await answerPilotChatWithEvents(retrievalText, effectiveContext, { getEvents: () => events.get() });
  const constrain = () => {
    result.items = filterDialogueCandidates(result.items, dialogue);
    result.events = filterDialogueCandidates(result.events, dialogue);
    result.eventEvidence = result.eventEvidence.filter(evidence => result.events.some(event => event.id === evidence.eventId));
  };
  constrain();
  trace.mark("retrieval");
  result.reply = localizedSearchReply(parsed.data.language, result);
  let assistant: SmartAssistantResult = { mode: "deterministic", reply: result.reply, citations: [], model: null,
    reason: aiGate?.available === false ? aiGate.reason : "AI_NOT_REQUESTED" };
  let googlePlaces: GooglePlacesResult | undefined;
  let reasoningMode: "plan_retrieve_answer" | "deterministic" = "deterministic";
  if (executeAI) {
    const input = { text: parsed.data.text, language: parsed.data.language, history, context: result.proposedContext,
      evidence: { items: result.items, events: result.events, eventEvidence: result.eventEvidence, reply: result.reply } };
    if (publicRuntime) {
      const reasoned = await answerReasonedAssistant({ ...input, language: parsed.data.language }, publicRuntime.dependencies(auth.session.id, request.headers.get('idempotency-key') ?? crypto.randomUUID()), async proposedPlan => {
        // Explicit user dialogue is authoritative. A model cannot turn an agreed
        // walk into dining (and spend Google's quota) or silently replace events.
        const knownIntent = dialogue.intent === "date"
          ? effectiveContext.goal === "food" ? "food" : result.eventsMeta ? "events" : "places"
          : dialogue.intent;
        const contradicts = knownIntent !== "general" && proposedPlan.intent !== knownIntent;
        const plan = contradicts ? { ...proposedPlan, intent: knownIntent as "food" | "events" | "places", query: retrievalText.slice(0, 240), cuisineOrDish: null } : proposedPlan;
        if ((plan.intent === "general" || plan.intent === "clarify") && dialogue.intent === "general") result = { ...result, reply: localizedClarification(parsed.data.language), items: [], events: [], eventEvidence: [], eventsMeta: null };
        if (plan.intent === "events") result = await answerPilotChatWithEvents(retrievalText, effectiveContext, {
          getEvents: () => events.get(), forceEvents: true, semanticText: plan.query,
        });
        if (plan.intent === "places" && result.items.length) {
          // Re-query only the already admissible pool; model terms cannot widen it.
          const ids = new Set(result.items.map(item => item.id));
          result = { ...result, items: searchPilotPlaces(result.proposedContext, positiveCategoryQuery(plan.query), pilotPlaces.filter(place => ids.has(place.id))), events: [], eventEvidence: [], eventsMeta: null };
        }
        if (plan.intent === "food") {
          // The planner routes meaning; original text still owns money/time limits.
          const foodContext = parseContext(retrievalText, { ...effectiveContext, goal: "food" });
          const query = plan.cuisineOrDish ?? plan.query;
          const candidates = filterDialogueCandidates(pilotPlaces, dialogue).filter(place => requestedFoodMatch(place, retrievalText, plan.cuisineOrDish));
          const items = searchPilotPlaces(foodContext, query, candidates);
          result = { ...result, proposedContext: foodContext, items, events: [], eventEvidence: [], eventsMeta: null };
          const google = getGooglePlacesRuntime();
          googlePlaces = foodContext.strictBudget && foodContext.budget !== null
            ? unavailableGooglePlaces("GOOGLE_PRICE_NOT_VERIFIED")
            : parsed.data.googleConsent && google
            ? await google.search({ query, language: parsed.data.language, consent: true, requestId: crypto.randomUUID() })
            : unavailableGooglePlaces(parsed.data.googleConsent ? "GOOGLE_SERVER_KEY_REQUIRED" : "GOOGLE_CONSENT_REQUIRED", parsed.data.googleConsent);
        }
        constrain();
        if (plan.intent !== "general" && plan.intent !== "clarify" || dialogue.intent !== "general") result.reply = localizedSearchReply(parsed.data.language, result);
        // A person's consent never grants a data source new LLM rights.
        const allowed = (id: string) => events.canSendToLlm ? events.canSendToLlm(id) : ["osm-overpass-poi", "sxodim-astana-noncommercial"].includes(id);
        const withheld = result.items.length > 0 && !allowed("osm-overpass-poi") || result.events.some(event => !allowed(event.provenance.sourceId));
        return { reply: withheld ? localizedClarification(parsed.data.language) : result.reply, items: allowed("osm-overpass-poi") ? result.items : [],
          events: result.events.filter(event => allowed(event.provenance.sourceId)),
          eventEvidence: result.eventEvidence.filter(event => result.events.some(item => item.id === event.eventId && allowed(item.provenance.sourceId))) };
      });
      if (reasoned.plan) reasoningMode = "plan_retrieve_answer";
      assistant = reasoned.assistant.reply ? reasoned.assistant : { ...reasoned.assistant, reply: result.reply };
    } else {
      const gate = getLocalAITestGate(request);
      assistant = gate.allowed
        ? await answerSmartAssistant(input, { executionScope: "local_test", quota: { reserve: () => reserveLocalAITestCall(request) } })
        : { ...assistant, reason: gate.reason };
    }
  }
  if (result.proposedContext.goal === "food" && !googlePlaces) {
    const google = getGooglePlacesRuntime();
    googlePlaces = localMemoryUsed ? unavailableGooglePlaces("MEMORY_LOCAL_ONLY")
      : result.proposedContext.strictBudget && result.proposedContext.budget !== null
      ? unavailableGooglePlaces("GOOGLE_PRICE_NOT_VERIFIED")
      : parsed.data.googleConsent && google
      ? await google.search({ query: retrievalText.slice(0, 240), language: parsed.data.language, consent: true, requestId: crypto.randomUUID() })
      : unavailableGooglePlaces(parsed.data.googleConsent ? "GOOGLE_SERVER_KEY_REQUIRED" : "GOOGLE_CONSENT_REQUIRED", parsed.data.googleConsent);
  }
  const meta = catalogMeta();
  const memoryStored = await remember(assistant.reply, assistant.mode);
  const warnings = assistant.mode === "openai"
    ? result.warnings.filter(warning => !warning.startsWith("Без внешнего AI:"))
    : result.warnings;
  trace.mark("generation");
  const traceId = await trace.finish(result.items.length || result.events.length ? "success" : "empty",
    { ...result, mode: assistant.mode, dataMode: result.eventsMeta?.dataMode ?? meta.dataMode },
    "eventRetrieval" in result ? result.eventRetrieval.excludedCount : null);
  return jsonResponse({ ...meta, ...result, ...assistant, generationMode: assistant.mode, reasoningMode, googlePlaces, memoryStored, language: parsed.data.language,
    dataMode: result.eventsMeta?.dataMode ?? meta.dataMode, warnings: [...(result.eventsMeta ? [] : meta.warnings), ...warnings, ...dialogue.warnings] }, 200,
    traceId ? { "x-qettyq-trace-id": traceId } : undefined);
  } catch (error) {
    await trace.finish("error");
    throw error;
  }
}

export function POST(request: Request) {
  const hosted = getHostedRuntime();
  return handleChat(request, hosted?.ai, hosted?.events, hosted?.memory);
}
