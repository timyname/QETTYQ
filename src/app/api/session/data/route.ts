import {
  blockCrossSiteMutation,
  jsonResponse,
  requireSession,
  responseMeta,
} from "../../../../server/session/http";
import { deleteSessionData } from "../../../../server/session/store";

export async function DELETE(request: Request) {
  const crossSite = blockCrossSiteMutation(request);
  if (crossSite) return crossSite;
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  const removed = deleteSessionData(auth.session);
  return jsonResponse({ ...responseMeta(), deleted: true, removed });
}
