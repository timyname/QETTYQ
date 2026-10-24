import { catalogMeta, pilotPlaces, publicPlace } from "../../../server/pilot/catalog";
import { jsonResponse } from "../../../server/session/http";
import { getHostedRuntime } from "../../../server/pilot/host-runtime";
import { sourcePermission } from "../../../server/retrieval/source-permission";
import { applicationSourcePolicy } from "../../../server/retrieval/application-source-policy";

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("cityId") ?? "astana";
  if (city !== "astana") return jsonResponse({ ...catalogMeta(), error: { code: "UNSUPPORTED_CITY" } }, 400);
  const policy = getHostedRuntime()?.events.resolveSourcePolicy ?? applicationSourcePolicy;
  const allowed = sourcePermission('osm-overpass-poi', 'display', policy, Date.now()).allowed;
  return jsonResponse({ ...catalogMeta(), cityId: "astana", items: allowed ? pilotPlaces.map(publicPlace) : [] });
}
