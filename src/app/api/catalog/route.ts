import { catalogMeta, pilotPlaces, publicPlace } from "../../../server/pilot/catalog";
import { jsonResponse } from "../../../server/session/http";

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("cityId") ?? "astana";
  if (city !== "astana") return jsonResponse({ ...catalogMeta(), error: { code: "UNSUPPORTED_CITY" } }, 400);
  return jsonResponse({ ...catalogMeta(), cityId: "astana", items: pilotPlaces.map(publicPlace) });
}
