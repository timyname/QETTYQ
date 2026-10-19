import {
  apiError,
  blockCrossSiteMutation,
  jsonResponse,
  readJson,
  requireIdempotencyKey,
  requireSession,
  responseMeta,
  validationError,
} from "../../../../server/session/http";
import { undoInputSchema } from "../../../../server/session/schemas";
import {
  SessionStoreError,
  undoLastReaction,
} from "../../../../server/session/store";

export async function POST(request: Request) {
  const crossSite = blockCrossSiteMutation(request);
  if (crossSite) return crossSite;
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  const idempotency = requireIdempotencyKey(request);
  if (!idempotency.ok) return idempotency.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const input = undoInputSchema.safeParse(body.value);
  if (!input.success) return validationError(input.error);

  try {
    const result = undoLastReaction(auth.session, idempotency.key);
    return jsonResponse({ ...responseMeta(), ...result });
  } catch (error) {
    if (error instanceof SessionStoreError) {
      if (error.code === "IDEMPOTENCY_CONFLICT") {
        return apiError("IDEMPOTENCY_CONFLICT", 409);
      }
      if (error.code === "NOTHING_TO_UNDO") {
        return apiError("NOTHING_TO_UNDO", 409);
      }
    }
    throw error;
  }
}
