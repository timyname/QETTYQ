import { z } from "zod";
import { getGooglePlacesRuntime, unavailableGooglePlaces } from "../../../../server/pilot/google-places";
import { blockCrossSiteMutation, requireSession, readJson, jsonResponse, validationError } from "../../../../server/session/http";
const schema = z.object({ query: z.string().trim().min(1).max(240), language: z.enum(["ru", "kk", "en"]).default("ru"), consent: z.boolean() }).strict();
export async function POST(request: Request) {
  const blocked = blockCrossSiteMutation(request); if (blocked) return blocked;
  const auth = requireSession(request); if (!auth.ok) return auth.response;
  const body = await readJson(request); if (!body.ok) return body.response;
  const input = schema.safeParse(body.value); if (!input.success) return validationError(input.error);
  const runtime = getGooglePlacesRuntime();
  const result = runtime ? await runtime.search({ ...input.data, requestId: crypto.randomUUID() }) : unavailableGooglePlaces();
  return jsonResponse(result, result.status === "live" ? 200 : result.status === "consent_required" ? 400 : 503);
}
