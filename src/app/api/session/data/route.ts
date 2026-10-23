import {
  blockCrossSiteMutation,
  jsonResponse,
  requireSession,
  responseMeta,
} from "../../../../server/session/http";
import { deleteSessionData } from "../../../../server/session/store";
import { getHostedRuntime } from "../../../../server/pilot/host-runtime";

export async function DELETE(request: Request) {
  const crossSite = blockCrossSiteMutation(request);
  if (crossSite) return crossSite;
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  try { getHostedRuntime()?.ragTraces?.deleteSession(auth.session.id); }
  catch { return jsonResponse({ deleted: false, error: { code: "DIAGNOSTIC_DELETE_UNAVAILABLE" } }, 503); }
  const removed = deleteSessionData(auth.session);
  return jsonResponse({ ...responseMeta(), deleted: true, removed });
}
