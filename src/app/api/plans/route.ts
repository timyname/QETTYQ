import { catalogMeta, pilotPlaces } from "../../../server/pilot/catalog";
import { planInputSchema } from "../../../server/pilot/contracts";
import { calculatePlan, publicPlan } from "../../../server/pilot/plans";
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
  const selected = ids.map((id) => pilotPlaces.find((place) => place.id === id));
  if (selected.some((place) => !place)) return apiError("VALIDATION_ERROR", 400);
  const fingerprint = JSON.stringify(input.data);
  const existing = auth.session.plans.find((plan) => plan.fingerprint === fingerprint);
  if (existing) return jsonResponse({ ...catalogMeta(), plan: publicPlan(existing), replayed: true, storageMode: "in_memory_ephemeral" });
  if (auth.session.plans.length >= 30) return apiError("RATE_LIMITED", 429);
  const plan = {
    ...calculatePlan(selected.filter((place) => place !== undefined), input.data.context),
    id: crypto.randomUUID(), createdAt: new Date().toISOString(), expiresAt: auth.session.expiresAt, fingerprint,
  };
  auth.session.plans.push(plan);
  return jsonResponse({ ...catalogMeta(), plan: publicPlan(plan), replayed: false, storageMode: "in_memory_ephemeral" }, 201);
}
