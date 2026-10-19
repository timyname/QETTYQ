import {
  apiError,
  blockCrossSiteMutation,
  jsonResponse,
  readJson,
  requireIdempotencyKey,
  requireSession,
  responseMeta,
  validationError,
} from "../../../server/session/http";
import { reactionInputSchema } from "../../../server/session/schemas";
import {
  SessionStoreError,
  recordReaction,
} from "../../../server/session/store";

export async function POST(request: Request) {
  const crossSite = blockCrossSiteMutation(request);
  if (crossSite) return crossSite;
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  const idempotency = requireIdempotencyKey(request);
  if (!idempotency.ok) return idempotency.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const input = reactionInputSchema.safeParse(body.value);
  if (!input.success) return validationError(input.error);

  try {
    const result = recordReaction(auth.session, input.data, idempotency.key);
    return jsonResponse({ ...responseMeta(), ...result }, result.replayed ? 200 : 201);
  } catch (error) {
    if (error instanceof SessionStoreError) {
      if (error.code === "IDEMPOTENCY_CONFLICT") {
        return apiError("IDEMPOTENCY_CONFLICT", 409);
      }
      if (error.code === "REACTION_LIMIT_REACHED") {
        return apiError("RATE_LIMITED", 429);
      }
    }
    throw error;
  }
}
