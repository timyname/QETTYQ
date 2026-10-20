import { pilotContextSchema } from "../../../server/pilot/contracts";
import { apiError, blockCrossSiteMutation, jsonResponse, readJson, requireSession, responseMeta, validationError } from "../../../server/session/http";

export async function POST(request: Request) {
  const blocked = blockCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = pilotContextSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);
  if (parsed.data.returnToOrigin && !parsed.data.origin) return apiError("VALIDATION_ERROR", 400);
  auth.session.context = parsed.data;
  return jsonResponse({ ...responseMeta(), context: auth.session.context });
}
