import { blockCrossSiteMutation, jsonResponse, readJson, requireSession } from '../../../server/session/http';
import { requestStreetRoute, routingStatus, validRoutingPoints } from '../../../server/pilot/street-routing';

export type RoutingRuntime = {
  reserve?: (sessionId: string) => Promise<boolean>;
  publicEnabled?: boolean;
  env?: Record<string, string | undefined>;
};
/** Sites injects a durable global reservation. A process-local guard is not sufficient for public traffic. */
export async function handleRouting(request: Request, options: RoutingRuntime = {}) {
  const env = { ...process.env, ...options.env };
  if (options.publicEnabled !== undefined) env.QETTYQ_PUBLIC_ROUTING_ENABLED = String(options.publicEnabled);
  // A public env flag alone can never bypass the actual injected limiter dependency.
  env.QETTYQ_ROUTING_GLOBAL_LIMITER_READY = options.reserve ? 'true' : 'false';
  const status = routingStatus(request, env);
  if (request.method === 'GET') return jsonResponse(status);
  if (request.method !== 'POST') return jsonResponse({ route: null, error: 'METHOD_NOT_ALLOWED' }, 405);
  const blocked = blockCrossSiteMutation(request); if (blocked) return blocked;
  const auth = requireSession(request); if (!auth.ok) return auth.response;
  const body = await readJson(request); if (!body.ok) return body.response;
  const input = body.value as Record<string, unknown> | null;
  // Explicit provider-bound consent. No automatic fallback transmits data elsewhere.
  if (!input || input.consent !== true || input.provider !== status.provider || !validRoutingPoints(input.points)) return jsonResponse({ route: null, error: 'ROUTING_CONSENT_OR_POINTS_INVALID' }, 400);
  if (!status.available) return jsonResponse({ route: null, error: status.reason }, 503);
  if (options.reserve) {
    try { if (!await options.reserve(auth.session.id)) return jsonResponse({ route: null, error: 'ROUTING_RATE_LIMITED' }, 429, { 'retry-after': '2' }); }
    catch { return jsonResponse({ route: null, error: 'ROUTING_LIMITER_UNAVAILABLE' }, 503); }
  }
  const result = await requestStreetRoute(input.points, status.provider, env.OPENROUTESERVICE_API_KEY);
  if (!result.ok) return jsonResponse({ route: null, error: result.reason, providerHttpStatus: result.providerHttpStatus ?? null }, result.reason === 'ROUTING_RATE_LIMITED' ? 429 : 503, result.retryAfterSeconds ? { 'retry-after': String(result.retryAfterSeconds) } : undefined);
  return jsonResponse({ route: result.route, dataMode: 'live' });
}
export function GET(request: Request) { return handleRouting(request); }
export function POST(request: Request) { return handleRouting(request); }
