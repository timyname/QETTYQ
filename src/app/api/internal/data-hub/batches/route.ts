import { getHostedRuntime } from "../../../../../server/pilot/host-runtime";

export async function POST(request: Request): Promise<Response> {
  const hub = getHostedRuntime()?.dataHub;
  if (!hub) return Response.json({ error: { code: "HUB_UNAVAILABLE" } }, { status: 503, headers: { "cache-control": "no-store" } });
  return hub.handle(request);
}
