import { redactDecimalCoordinates } from "./location-redaction";
import { loadGooglePlacePhoto, type GooglePlacePhoto } from "./google-place-photos";

export const GOOGLE_PLACES_APPROVAL_ID = "qettyq-google-10usd-20261020-v1";
export const GOOGLE_PLACES_CAP_MICRO_USD = 10_000_000;
export const GOOGLE_PLACES_RESERVE_MICRO_USD = 100_000;
// Reviewed 2026-10-21: one Enterprise search ($0.035) + <=5 photos
// ($0.007 each) <=$0.070. The EXISTING $0.10 reservation covers the whole
// bundle, with no refunds, retries, pagination or ledger reset. Cap stays $10.
export const GOOGLE_PLACES_FIELDS = "places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.location,places.currentOpeningHours,places.regularOpeningHours,places.attributions,places.photos";
export type GooglePlaceCard = { id: string; name: string; address: string | null; googleMapsUrl: string;
  openingHoursText: string[]; cuisineOrDishConfirmed: false; thirdPartyAttributions: { name: string; url: string | null }[]; photo: GooglePlacePhoto | null };
export type GooglePlacesResult = { status: "live" | "unavailable" | "consent_required"; reason: string | null;
  items: GooglePlaceCard[]; attribution: { text: "Google Maps"; url: "https://maps.google.com" }; storage: "no_store"; mapDisplay: "external_google_only" };
export type GooglePlacesRuntime = {
  search(input: { query: string; language: "ru" | "kk" | "en"; consent: boolean; requestId: string }): Promise<GooglePlacesResult>;
};
const registryKey = Symbol.for("qettyq.google-places-runtime.v1");
const registry = () => globalThis as typeof globalThis & { [key: symbol]: unknown };
export const getGooglePlacesRuntime = () => registry()[registryKey] as GooglePlacesRuntime | undefined;
export function setGooglePlacesRuntime(value: GooglePlacesRuntime | null) { if (value) registry()[registryKey] = value; else delete registry()[registryKey]; }
export function unavailableGooglePlaces(reason = "GOOGLE_SERVER_KEY_REQUIRED", consent = true): GooglePlacesResult {
  return { status: consent ? "unavailable" : "consent_required", reason, items: [],
    attribution: { text: "Google Maps", url: "https://maps.google.com" }, storage: "no_store", mapDisplay: "external_google_only" };
}
const url = (raw: unknown) => {
  if (typeof raw !== "string") return null;
  try { const value = new URL(raw); return value.protocol === "https:" && !value.username && !value.password ? value.href : null; } catch { return null; }
};
export function createGooglePlacesRuntime(options: { key?: string; enabled: boolean; approved: boolean;
  reserve?: (requestId: string) => boolean; fetcher?: typeof fetch }): GooglePlacesRuntime {
  return { async search(input) {
    if (!input.consent) return unavailableGooglePlaces("GOOGLE_CONSENT_REQUIRED", false);
    if (!options.key?.trim()) return unavailableGooglePlaces();
    if (!options.enabled || !options.approved) return unavailableGooglePlaces("GOOGLE_BUDGET_NOT_APPROVED");
    if (!options.reserve) return unavailableGooglePlaces("GOOGLE_BUDGET_STORAGE_UNAVAILABLE");
    const query = redactDecimalCoordinates(input.query, "").trim();
    if (!query || query.length > 240 || /https?:|www\.|[<>]/iu.test(query)) return unavailableGooglePlaces("GOOGLE_QUERY_INVALID");
    try { if (!options.reserve(input.requestId)) return unavailableGooglePlaces("GOOGLE_BUDGET_OR_RATE_LIMIT"); }
    catch { return unavailableGooglePlaces("GOOGLE_BUDGET_STORAGE_UNAVAILABLE"); }
    try {
      const response = await (options.fetcher ?? fetch)("https://places.googleapis.com/v1/places:searchText", {
        method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000),
        headers: { "content-type": "application/json", "X-Goog-Api-Key": options.key.trim(), "X-Goog-FieldMask": GOOGLE_PLACES_FIELDS },
        body: JSON.stringify({ textQuery: `Астана, Казахстан: ${query}`, languageCode: input.language, maxResultCount: 5,
          locationRestriction: { rectangle: { low: { latitude: 51.02, longitude: 71.30 }, high: { latitude: 51.22, longitude: 71.60 } } } }),
      });
      // Never echo Google's response error: it may contain credential/query details.
      if (!response.ok) return unavailableGooglePlaces(response.status === 403 ? "GOOGLE_ACCESS_NOT_ENABLED" : response.status === 429 ? "GOOGLE_RATE_LIMITED" : "GOOGLE_PROVIDER_UNAVAILABLE");
      const raw = await response.text(); if (new TextEncoder().encode(raw).byteLength > 256_000) return unavailableGooglePlaces("GOOGLE_RESPONSE_INVALID");
      const body = JSON.parse(raw) as { places?: Record<string, unknown>[] };
      if (!Array.isArray(body.places)) return { ...unavailableGooglePlaces(), status: "live", reason: null };
      const parsed = body.places.slice(0, 5).flatMap(place => {
        const location = place.location as { latitude?: number; longitude?: number } | undefined;
        const mapsUrl = url(place.googleMapsUri), name = (place.displayName as { text?: unknown } | undefined)?.text;
        const mapsLink = mapsUrl ? new URL(mapsUrl) : null;
        const googleLink = mapsLink && (mapsLink.hostname === "maps.google.com" || ["google.com", "www.google.com"].includes(mapsLink.hostname) && mapsLink.pathname.startsWith("/maps"));
        if (typeof place.id !== "string" || typeof name !== "string" || !mapsUrl || !googleLink
          || !location || typeof location.latitude !== "number" || typeof location.longitude !== "number"
          || location.latitude < 51.02 || location.latitude > 51.22 || location.longitude < 71.30 || location.longitude > 71.60) return [];
        const hours = (place.currentOpeningHours ?? place.regularOpeningHours) as { weekdayDescriptions?: unknown[] } | undefined;
        const thirdPartyAttributions = (Array.isArray(place.attributions) ? place.attributions : []).flatMap(value => {
          const entry = value as { provider?: unknown; providerUri?: unknown }, link = url(entry.providerUri);
          return typeof entry.provider === "string" ? [{ name: entry.provider.slice(0, 120), url: link }] : [];
        });
        return [{ id: place.id.slice(0, 200), name: name.slice(0, 300), address: typeof place.formattedAddress === "string" ? place.formattedAddress.slice(0, 500) : null,
          googleMapsUrl: mapsUrl, openingHoursText: (hours?.weekdayDescriptions ?? []).filter((value): value is string => typeof value === "string").slice(0, 7),
          cuisineOrDishConfirmed: false as const, thirdPartyAttributions, photos: place.photos }];
      });
      const items = await Promise.all(parsed.map(async ({ photos, ...item }) => ({ ...item,
        photo: await loadGooglePlacePhoto(item.id, photos, { key: options.key!.trim(), fetcher: options.fetcher ?? fetch }),
      })));
      // No response cache, persistence, embedding, LLM transfer or OSM coordinates.
      return { ...unavailableGooglePlaces(), status: "live", reason: null, items };
    } catch { return unavailableGooglePlaces("GOOGLE_PROVIDER_UNAVAILABLE"); }
  } };
}
