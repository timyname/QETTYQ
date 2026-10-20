import { getAITestStatus } from "../../../../server/pilot/ai-test-quota";
import { jsonResponse, requireSession } from "../../../../server/session/http";
import type { PublicAIRuntime } from "../../../../server/pilot/public-ai-runtime";

export async function handleAssistantStatus(request: Request, publicRuntime?: PublicAIRuntime) {
  if (publicRuntime) {
    const auth = requireSession(request);
    if (!auth.ok) return auth.response;
    return jsonResponse(await publicRuntime.getStatus(auth.session.id));
  }
  return jsonResponse(await getAITestStatus(request));
}

export function GET(request: Request) { return handleAssistantStatus(request); }
