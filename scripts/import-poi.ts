import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Place } from "../src/domain/types";

const endpoint = "https://overpass-api.de/api/interpreter";
const bbox = "51.02,71.30,51.22,71.60";
const query = `[out:json][timeout:30];(
  nwr["name"]["amenity"~"cafe|restaurant|fast_food|theatre|arts_centre|library"](${bbox});
  nwr["name"]["tourism"~"museum|gallery"](${bbox});
  nwr["name"]["leisure"~"park|garden"](${bbox});
);out center tags 800;`;

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = { osm3s?: { timestamp_osm_base?: string }; elements: OsmElement[] };

function normalize(element: OsmElement, retrievedAt: string): Place | null {
  const tags = element.tags ?? {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (!tags.name || lat === undefined || lon === undefined) return null;
  const category = tags.amenity ?? tags.tourism ?? tags.leisure ?? "place";
  const address = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", ") || null;
  const normalizedTags = [
    category,
    ...(tags.cuisine?.split(";") ?? []),
    ...(category === "museum" || category === "theatre" || category === "arts_centre" ? ["culture"] : []),
    ...(category === "cafe" || category === "restaurant" || category === "fast_food" ? ["food"] : []),
  ];
  return {
    id: `osm:${element.type}:${element.id}`,
    name: tags["name:ru"] ?? tags.name,
    category,
    lat,
    lon,
    address,
    tags: [...new Set(normalizedTags)],
    sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    sourceName: "OpenStreetMap contributors",
    retrievedAt,
    dataMode: "snapshot",
    price: null,
    durationMinutes: category === "cafe" || category === "fast_food" ? 35 : category === "restaurant" ? 55 : 60,
    openingHours: tags.opening_hours?.slice(0, 500) ?? null,
    website: /^https:\/\//.test(tags.website ?? tags["contact:website"] ?? "") ? (tags.website ?? tags["contact:website"]) : null,
    cuisines: tags.cuisine?.split(";").map(value => value.trim()).filter(Boolean).slice(0, 20) ?? [],
    coordinateQuality: element.type === "node" ? "observed" : "derived",
    nameTranslations: Object.fromEntries(["ru", "kk", "en"].flatMap(language => tags[`name:${language}`] ? [[language, tags[`name:${language}`]]] : [])),
  };
}

async function main() {
  const body = new URLSearchParams({ data: query });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "QETTYQ-Astana-pilot/1.0 (+https://qettyqapp.anamai.kz/; one-off bounded import)" },
    body,
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
  const payload = (await response.json()) as OverpassResponse;
  const retrievedAt = new Date().toISOString();
  const places = payload.elements.map((item) => normalize(item, retrievedAt)).filter((item): item is Place => Boolean(item));
  const unique = [...new Map(places.map((item) => [item.id, item])).values()];
  if (!unique.length || unique.length > 800 || payload.elements.length > 800) throw new Error("Invalid bounded import; previous snapshot preserved");
  await mkdir(path.join(process.cwd(), "data", "snapshots"), { recursive: true });
  await writeFile(path.join(process.cwd(), "data", "places.json"), `${JSON.stringify(unique, null, 2)}\n`);
  await writeFile(path.join(process.cwd(), "data", "snapshots", `osm-astana-${retrievedAt.slice(0, 10)}.json`), `${JSON.stringify({ retrievedAt, osmBase: payload.osm3s?.timestamp_osm_base ?? null, places: unique }, null, 2)}\n`);
  console.log(JSON.stringify({ source: endpoint, retrievedAt, osmBase: payload.osm3s?.timestamp_osm_base ?? null, records: unique.length, withHours: unique.filter(place => place.openingHours).length, withCuisine: unique.filter(place => place.cuisines?.length).length }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
