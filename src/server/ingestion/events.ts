import { createHash } from "node:crypto";

/** Internal ingestion contract. Never expose this record directly from public API. */
export type EventSourcePolicy = {
  id: string;
  name: string;
  status: "candidate" | "approved_for_scope" | "link_only" | "blocked";
  evidenceUrl: string | null;
  allowedUrls: string[];
  allowFetch: boolean;
  allowPersist: boolean;
  allowDisplay: boolean;
  allowDescription: boolean;
  allowMediaDisplay: boolean;
  allowMediaDownload: boolean;
  mediaLicense: string | null;
  requiredCredit: string | null;
  robotsReviewedAt: string | null;
  minimumRefreshMinutes: number;
  maxAgeMinutes: number;
};

export type ImportedEvent = {
  id: string;
  externalId: string;
  cityId: "astana";
  name: string;
  description: string | null;
  localDate: string | null;
  startsAt: string | null;
  endsAt: string | null;
  timeZone: "Asia/Almaty";
  contentLanguages: Array<"ru" | "kk" | "en">;
  venue: { name: string | null; address: string | null; lat: number | null; lon: number | null };
  price: { kind: "unknown" | "exact" | "from" | "range"; minMinor: number | null; maxMinor: number | null; currency: "KZT" | null; basis: "unknown" };
  availability: "unknown" | "available" | "sold_out";
  status: "unknown" | "scheduled" | "cancelled" | "postponed" | "rescheduled";
  bookingUrl: string | null;
  organizer: { name: string | null; url: string | null };
  image: { sourceUrl: string; displayUrl: string | null; downloadAllowed: boolean; license: string | null; credit: string | null } | null;
  requiredCredit: { text: string; url: string } | null;
  dataMode: "snapshot" | "synthetic_test";
  provenance: { sourceId: string; sourceName: string; sourceUrl: string; retrievedAt: string; validUntil: string; contentHash: string; parserVersion: "jsonld-event-v1" };
  warnings: string[];
};

type JsonObject = Record<string, unknown>;
export type ImportResult = { records: ImportedEvent[]; rejected: Array<{ index: number; reason: string }>; documentHash: string };
const hash = (input: string) => createHash("sha256").update(input).digest("hex");
const obj = (input: unknown): JsonObject => input !== null && typeof input === "object" && !Array.isArray(input) ? input as JsonObject : {};
const first = (input: unknown): unknown => Array.isArray(input) ? input[0] : input;
const list = (input: unknown): unknown[] => input == null ? [] : Array.isArray(input) ? input : [input];
const suffix = (input: unknown) => typeof input === "string" ? input.split(/[\/#]/).pop() : null;
const eventTypes = new Set(["Event", "MusicEvent", "TheaterEvent", "DanceEvent", "ScreeningEvent", "ExhibitionEvent", "EducationEvent", "SportsEvent", "SocialEvent", "Festival", "FoodEvent", "ChildrensEvent", "VisualArtsEvent", "ComedyEvent", "LiteraryEvent"]);

export function plainText(input: unknown, limit = 500): string | null {
  if (typeof input !== "string") return null;
  const clean = input.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
  return clean || null;
}

/** URL normalization deliberately excludes credentials, fragments and private/local hosts. */
export function publicHttpsUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    if ([...url.searchParams.keys()].some((key) => /^(access_token|api_?key|token|secret|password|signature|x-amz-signature)$/i.test(key))) return null;
    const hostname = url.hostname.toLowerCase();
    if (!hostname.includes(".") || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) || hostname.includes(":") || /\.(local|internal|invalid)$/.test(hostname)) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}

export function assertImportPolicy(policy: EventSourcePolicy, sourceUrl: string): void {
  if (policy.status !== "approved_for_scope" || !policy.allowPersist || !policy.allowDisplay || !policy.evidenceUrl) throw new Error("SOURCE_POLICY_NOT_APPROVED");
  if (!Number.isFinite(policy.maxAgeMinutes) || policy.maxAgeMinutes < 1 || !Number.isFinite(policy.minimumRefreshMinutes) || policy.minimumRefreshMinutes < 1) throw new Error("INVALID_FRESHNESS_POLICY");
  const normalized = publicHttpsUrl(sourceUrl);
  if (!normalized || !policy.allowedUrls.some((url) => publicHttpsUrl(url) === normalized)) throw new Error("SOURCE_URL_NOT_ALLOWLISTED");
}

function normalizedInstant(input: unknown): { utc: string | null; date: string | null; invalid: boolean } {
  if (input == null || input === "") return { utc: null, date: null, invalid: false };
  if (typeof input !== "string") return { utc: null, date: null, invalid: true };
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const parsed = new Date(`${input}T00:00:00.000Z`);
    return { utc: null, date: Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === input ? input : null, invalid: !Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== input };
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(input)) return { utc: null, date: null, invalid: true };
  const parsed = new Date(input);
  // JS Date normalizes 30 February; reject invalid source calendar dates first.
  const datePart = normalizedInstant(input.slice(0, 10));
  return { utc: Number.isFinite(+parsed) && !datePart.invalid ? parsed.toISOString() : null, date: null, invalid: !Number.isFinite(+parsed) || datePart.invalid };
}

function minor(input: unknown): number | null {
  const str = typeof input === "number" ? String(input) : typeof input === "string" ? input.trim() : "";
  if (!/^\d+(\.\d{1,2})?$/.test(str)) return null;
  const [whole, decimals = ""] = str.split(".");
  const value = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(value) ? value : null;
}

function parsePrice(offer: JsonObject): ImportedEvent["price"] {
  const unknown: ImportedEvent["price"] = { kind: "unknown", minMinor: null, maxMinor: null, currency: null, basis: "unknown" };
  if (offer.priceCurrency !== "KZT") return unknown;
  const exact = minor(offer.price);
  if (exact !== null) return { kind: "exact", minMinor: exact, maxMinor: exact, currency: "KZT", basis: "unknown" };
  const low = minor(offer.lowPrice), high = minor(offer.highPrice);
  if (low === null || (high !== null && high < low)) return unknown;
  return { kind: high === null ? "from" : "range", minMinor: low, maxMinor: high, currency: "KZT", basis: "unknown" };
}

function extractNodes(document: string): unknown[] {
  if (Buffer.byteLength(document, "utf8") > 512_000) throw new Error("DOCUMENT_TOO_LARGE");
  const nodes: unknown[] = [];
  function add(input: unknown, depth = 0) {
    if (depth > 12 || nodes.length >= 500) throw new Error("DOCUMENT_COMPLEXITY_LIMIT");
    if (Array.isArray(input)) { for (const value of input) add(value, depth + 1); return; }
    const value = obj(input);
    if (list(value["@type"]).some((type) => eventTypes.has(suffix(type) ?? ""))) nodes.push(value);
    if (value["@graph"]) add(value["@graph"], depth + 1);
    if (value.itemListElement) for (const element of list(value.itemListElement)) add(obj(element).item ?? element, depth + 1);
  }
  const trimmed = document.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) add(JSON.parse(trimmed));
  else {
    const scripts = document.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi);
    for (const script of scripts) { try { add(JSON.parse(script[1])); } catch (error) { if (error instanceof Error && error.message === "DOCUMENT_COMPLEXITY_LIMIT") throw error; } }
  }
  return nodes;
}

/** Only source fields are used: no geocoding, inferred language or guessed event time. */
export function parseEventDocument(document: string, policy: EventSourcePolicy, sourceUrl: string, options: { now: string; dataMode?: "snapshot" | "synthetic_test" }): ImportResult {
  assertImportPolicy(policy, sourceUrl);
  const now = new Date(options.now);
  if (!Number.isFinite(+now)) throw new Error("INVALID_IMPORT_CLOCK");
  const documentHash = hash(document), records: ImportedEvent[] = [], rejected: ImportResult["rejected"] = [];
  const nodes = extractNodes(document);
  for (const [index, node] of nodes.entries()) {
    const event = obj(node), name = plainText(event.name, 180), start = normalizedInstant(event.startDate), end = normalizedInstant(event.endDate);
    if (!name) { rejected.push({ index, reason: "MISSING_EVENT_NAME" }); continue; }
    if (start.invalid || end.invalid || (start.utc && end.utc && end.utc <= start.utc)) { rejected.push({ index, reason: "INVALID_OR_AMBIGUOUS_DATE" }); continue; }
    const location = obj(first(event.location)), addressObject = obj(location.address);
    const address = typeof location.address === "string" ? plainText(location.address) : [plainText(addressObject.streetAddress), plainText(addressObject.addressLocality), plainText(addressObject.postalCode)].filter(Boolean).join(", ") || null;
    const locality = plainText(addressObject.addressLocality)?.toLowerCase();
    const geo = obj(location.geo), latRaw = geo.latitude, lonRaw = geo.longitude;
    const lat = typeof latRaw === "string" && latRaw.trim() ? Number(latRaw) : typeof latRaw === "number" ? latRaw : null;
    const lon = typeof lonRaw === "string" && lonRaw.trim() ? Number(lonRaw) : typeof lonRaw === "number" ? lonRaw : null;
    if ((lat !== null || lon !== null) && (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < 50.9 || lat > 51.35 || lon < 71.15 || lon > 71.75)) { rejected.push({ index, reason: "INVALID_OR_OUT_OF_CITY_COORDINATES" }); continue; }
    if (locality && !["астана", "astana", "нур-султан", "nur-sultan"].includes(locality)) { rejected.push({ index, reason: "UNSUPPORTED_CITY" }); continue; }
    if (lat === null && !locality) { rejected.push({ index, reason: "CITY_NOT_VERIFIED" }); continue; }
    const offer = obj(first(event.offers)), price = parsePrice(offer), organizer = obj(first(event.organizer));
    const sourceImage = first(event.image), imageUrl = publicHttpsUrl(typeof sourceImage === "string" ? sourceImage : obj(sourceImage).contentUrl ?? obj(sourceImage).url);
    const externalId = plainText(event["@id"], 500) ?? publicHttpsUrl(event.url) ?? hash(`${name}|${plainText(location.name)}|${address}|${event.startDate ?? ""}`);
    const warnings: string[] = [];
    if (!start.utc) warnings.push(start.date ? "START_TIME_UNKNOWN" : "SCHEDULE_UNKNOWN");
    if (!end.utc) warnings.push("END_TIME_UNKNOWN");
    if (lat === null) warnings.push("COORDINATES_UNKNOWN");
    if (price.kind === "unknown") warnings.push("PRICE_UNKNOWN");
    const languageMap: Record<string, "ru" | "kk" | "en"> = { ru: "ru", kk: "kk", kz: "kk", en: "en" };
    const contentLanguages = [...new Set(list(event.inLanguage).map((value) => typeof value === "string" ? languageMap[value.toLowerCase().split("-")[0]] : undefined).filter((value): value is "ru" | "kk" | "en" => value !== undefined))];
    if (!contentLanguages.length) warnings.push("CONTENT_LANGUAGE_UNKNOWN");
    const statuses: Record<string, ImportedEvent["status"]> = { EventScheduled: "scheduled", EventCancelled: "cancelled", EventPostponed: "postponed", EventRescheduled: "rescheduled" };
    const availability: Record<string, ImportedEvent["availability"]> = { InStock: "available", LimitedAvailability: "available", SoldOut: "sold_out", OutOfStock: "sold_out" };
    records.push({
      id: `${policy.id}:${hash(externalId).slice(0, 24)}`, externalId, cityId: "astana", name,
      description: policy.allowDescription ? plainText(event.description, 800) : null,
      localDate: start.date, startsAt: start.utc, endsAt: end.utc, timeZone: "Asia/Almaty", contentLanguages,
      venue: { name: plainText(location.name, 180), address, lat, lon }, price,
      availability: availability[suffix(offer.availability) ?? ""] ?? "unknown", status: statuses[suffix(event.eventStatus) ?? ""] ?? "unknown",
      bookingUrl: publicHttpsUrl(offer.url), organizer: { name: plainText(organizer.name, 180), url: publicHttpsUrl(organizer.url) },
      image: imageUrl ? { sourceUrl: imageUrl, displayUrl: policy.allowMediaDisplay && policy.mediaLicense ? imageUrl : null, downloadAllowed: policy.allowMediaDownload && Boolean(policy.mediaLicense), license: policy.mediaLicense, credit: policy.requiredCredit } : null,
      requiredCredit: policy.requiredCredit ? { text: policy.requiredCredit, url: sourceUrl } : null,
      dataMode: options.dataMode ?? "snapshot",
      provenance: { sourceId: policy.id, sourceName: policy.name, sourceUrl, retrievedAt: now.toISOString(), validUntil: new Date(+now + policy.maxAgeMinutes * 60_000).toISOString(), contentHash: documentHash, parserVersion: "jsonld-event-v1" }, warnings,
    });
  }
  return { records: mergeEventSnapshots([], records).records, rejected, documentHash };
}

/** Idempotent source/external-id upsert. Absent entries are NOT silently deleted. */
export function mergeEventSnapshots(previous: ImportedEvent[], incoming: ImportedEvent[]) {
  const byId = new Map(previous.map((event) => [event.id, event]));
  const changes: Array<{ id: string; previousStart: string | null; nextStart: string | null }> = [];
  for (const event of incoming) {
    const existing = byId.get(event.id);
    if (existing && existing.provenance.retrievedAt > event.provenance.retrievedAt) continue;
    if (existing && existing.startsAt !== event.startsAt) changes.push({ id: event.id, previousStart: existing.startsAt, nextStart: event.startsAt });
    byId.set(event.id, event);
  }
  return { records: [...byId.values()], changes };
}

export function eventIsDiscoverable(event: ImportedEvent, now: string): boolean {
  const time = Date.parse(now);
  return Number.isFinite(time) && event.dataMode !== "synthetic_test" && Date.parse(event.provenance.validUntil) > time && event.status !== "cancelled" && event.status !== "postponed" && event.availability !== "sold_out" && event.startsAt !== null && Date.parse(event.startsAt) >= time;
}

/** Compact consumer shape: raw source metadata remains admin-only; mandatory credit stays. */
export function toPublicEvent(event: ImportedEvent) {
  return { id: event.id, cityId: event.cityId, name: event.name, description: event.description, localDate: event.localDate, startsAt: event.startsAt, endsAt: event.endsAt, timeZone: event.timeZone, contentLanguages: event.contentLanguages, venue: event.venue, price: event.price, availability: event.availability, status: event.status, bookingUrl: event.bookingUrl, organizer: event.organizer, image: event.image?.displayUrl ? { url: event.image.displayUrl, credit: event.image.credit, license: event.image.license } : null, requiredCredit: event.requiredCredit, checkedAt: event.provenance.retrievedAt, validUntil: event.provenance.validUntil, dataMode: event.dataMode, warnings: event.warnings };
}
