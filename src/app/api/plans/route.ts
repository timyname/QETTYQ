import { catalogMeta, pilotPlaces, publicPlace } from "../../../server/pilot/catalog";
import { planInputSchema } from "../../../server/pilot/contracts";
import { calculateMixedPlan, publicPlan, type PlanStop } from "../../../server/pilot/plans";
import { eventPlanStop } from "../../../server/pilot/event-plan-stop";
import { getHostedRuntime } from "../../../server/pilot/host-runtime";
import { liveEventsService } from "../../../server/ingestion/live-events";
import { apiError, blockCrossSiteMutation, jsonResponse, readJson, requireSession, validationError } from "../../../server/session/http";

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  return jsonResponse({ ...catalogMeta(), items: auth.session.plans.map(publicPlan), storageMode: "in_memory_ephemeral" });
}

export async function POST(request: Request) {
  const blocked = blockCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const input = planInputSchema.safeParse(body.value);
  if (!input.success) return validationError(input.error);
  const ids = input.data.placeIds;
  if (new Set(ids).size !== ids.length) return apiError("VALIDATION_ERROR", 400);
  if (ids.some(id => !pilotPlaces.some(place => place.id === id) && !/^(?:sxodim:|hub:)/u.test(id))) return apiError("VALIDATION_ERROR", 400);
  const hasEvents = ids.some(id => !pilotPlaces.some(place => place.id === id));
  let events: Awaited<ReturnType<typeof liveEventsService.get>>['items'] = [];
  if (hasEvents) {
    try {
      const feed = await (getHostedRuntime()?.events ?? liveEventsService).get();
      events = feed.items.map(event => ({ ...event, freshness: event.freshness ?? (feed.freshness === 'fresh' ? 'fresh' : 'stale') }));
    }
    catch { return apiError("PROVIDER_UNAVAILABLE", 503); }
  }
  const selected = ids.map((id): PlanStop | null => {
    const place = pilotPlaces.find(place => place.id === id);
    if (place) return publicPlace(place);
    const event = events.find(event => event.id === id);
    return event ? eventPlanStop(event) : null;
  });
  if (selected.some((place) => !place)) return apiError("VALIDATION_ERROR", 400);
  const fingerprint = JSON.stringify({ ...input.data, eventFacts: selected.filter(stop => stop?.eventStartsAt).map(stop => ({ id: stop!.id, startsAt: stop!.eventStartsAt, endsAt: stop!.eventEndsAt, duration: stop!.durationMinutes, lat: stop!.lat, lon: stop!.lon, price: stop!.price })) });
  const existing = auth.session.plans.find((plan) => plan.fingerprint === fingerprint);
  if (existing) return jsonResponse({ ...catalogMeta(), plan: publicPlan(existing), replayed: true, storageMode: "in_memory_ephemeral" });
  if (auth.session.plans.length >= 30) return apiError("RATE_LIMITED", 429);
  const plan = {
    ...calculateMixedPlan(selected.filter((place): place is PlanStop => place !== null), input.data.context),
    id: crypto.randomUUID(), createdAt: new Date().toISOString(), expiresAt: auth.session.expiresAt, fingerprint,
  };
  auth.session.plans.push(plan);
  return jsonResponse({ ...catalogMeta(), plan: publicPlan(plan), replayed: false, storageMode: "in_memory_ephemeral" }, 201);
}
