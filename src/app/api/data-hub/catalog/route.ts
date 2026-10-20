import { getHostedRuntime } from "../../../../server/pilot/host-runtime";

/** Public accepted facts only. Never expose inbox/quarantine/producer metadata. */
export async function GET(request: Request): Promise<Response> {
  const headers = { "cache-control": "no-store, max-age=0" };
  const city = new URL(request.url).searchParams.get("city") ?? "astana";
  if (city !== "astana") return Response.json({ error: { code: "UNSUPPORTED_CITY" } }, { status: 400, headers });
  const hub = getHostedRuntime()?.dataHub;
  if (!hub) return Response.json({ error: { code: "HUB_UNAVAILABLE" } }, { status: 503, headers });
  try { return Response.json(await hub.getFeed({ cityId: "astana" }), { headers }); }
  catch { return Response.json({ error: { code: "HUB_UNAVAILABLE" } }, { status: 503, headers }); }
}
