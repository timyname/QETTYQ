import { liveEventsService } from "../../../server/ingestion/live-events";
import { resolveEventMedia } from "../../../server/ingestion/sxodim-live";
import { getHostedRuntime, type HostedRuntime } from "../../../server/pilot/host-runtime";

export const dynamic = "force-dynamic";

function localDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}

export async function handleEvents(request: Request, events: HostedRuntime["events"] = liveEventsService) {
  const parameters = new URL(request.url).searchParams;
  const city = parameters.get("city") ?? "astana", date = parameters.get("date"), query = parameters.get("q")?.trim().toLowerCase() ?? "";
  const headers = { "cache-control": "no-store, max-age=0", "content-type": "application/json; charset=utf-8" };
  if (city !== "astana") return Response.json({ error: { code: "UNSUPPORTED_CITY", message: "Пока поддерживается только Астана." } }, { status: 400, headers });
  if (query.length > 120 || date !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) return Response.json({ error: { code: "VALIDATION_ERROR" } }, { status: 400, headers });
  let data;
  try { data = await events.get(); }
  catch {
    // Do not bypass the durable source lease with an unbounded fallback fetch.
    return Response.json({ items: [], dataMode: "unavailable", freshness: "unavailable", warnings: ["Не удалось проверить афишу. События не выдумываются."], error: { code: "EVENTS_UNAVAILABLE" } }, { status: 503, headers });
  }
  const items = data.items.filter(event => (!date || localDate(event.startsAt) === date) && (!query || `${event.name} ${event.venueName ?? ""} ${event.category ?? ""}`.toLowerCase().includes(query))).map(event => ({ ...event, media: resolveEventMedia(event) }));
  return Response.json({ ...data, items, cityId: "astana", requestId: crypto.randomUUID(), generatedAt: new Date().toISOString(), total: items.length }, { status: data.dataMode === "unavailable" ? 503 : 200, headers });
}
export function GET(request: Request) { return handleEvents(request, getHostedRuntime()?.events); }
