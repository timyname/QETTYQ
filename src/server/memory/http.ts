import { getHostedRuntime } from "../pilot/host-runtime";
import { blockCrossSiteMutation, jsonResponse, requireSession } from "../session/http";
import type { MemoryOperation, MemoryService } from "./contracts";

/** Node-free route bridge: absent durable backend means 503, never RAM fallback. */
export async function handleMemoryRoute(request: Request, operation: MemoryOperation, service: MemoryService | undefined = getHostedRuntime()?.memory) {
  if (request.method !== "GET") { const blocked = blockCrossSiteMutation(request); if (blocked) return blocked; }
  const auth = requireSession(request); if (!auth.ok) return auth.response;
  if (!service) return jsonResponse({ available: false, error: { code: "MEMORY_STORAGE_UNAVAILABLE" } }, 503);
  return service.handle(request, operation);
}
