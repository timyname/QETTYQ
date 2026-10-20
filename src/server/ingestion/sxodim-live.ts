import defaultMediaPolicy from "../../../data/media-policy.json";
import ownedIllustrations from "../../../public/assets/ideas/manifest.json";

/** Worker-compatible, fixed-source adapter. No Node TCP/DNS, login, JS evaluation or photos. */
export const SXODIM_INDEX = "https://sxodim.com/astana";
export const SXODIM_TERMS = "https://sxodim.com/polzovatelskoe-soglashenie";
export const EVENT_REFRESH_MS = 60 * 60 * 1000;
const MAX_BYTES = 512_000;
const MAX_DETAILS = 8;

export type LiveAstanaEvent = {
  id: string; name: string; cityId: "astana"; category: string | null;
  venueName: string | null; address: string | null; lat: number | null; lon: number | null;
  startsAt: string; endsAt: string | null; timeZone: "Asia/Almaty";
  durationMinutes: number | null; contentLanguage: "ru" | "kk" | "en" | "und";
  priceFromKzt: number | null;
  price: { kind: "unknown" | "exact" | "from"; minMinor: number | null; currency: "KZT" | null; basis: "unknown" };
  status: "scheduled" | "unknown"; availability: "unknown";
  bookingUrl: string | null; contactUrl: string; organizerUrl?: string | null; image: null;
  requiredCredit: { text: "Давай Сходим"; url: string };
  fetchedAt: string;
  provenance: { sourceId: "sxodim-astana-noncommercial"; sourceUrl: string; parserVersion: "sxodim-jsonld-v1"; scheduleQuality: "observed"; priceQuality: "observed" | "unknown" | "conflicting" };
  warnings: string[];
};
export type SxodimSnapshot = {
  source: { id: "sxodim-astana-noncommercial"; name: "Давай Сходим"; url: string; termsUrl: string; reuse: "noncommercial_with_credit"; mediaCopied: false };
  fetchedAt: string; expiresAt: string; items: LiveAstanaEvent[];
  coverage: { indexCandidates: number; detailPagesRequested: number; importedOccurrences: number; rejected: number; scope: string };
};
export type SourceFetcher = (input: string, init?: RequestInit) => Promise<Response>;
export type PublisherMediaCandidate = {
  publisher: "sxodim-astana-noncommercial";
  sourcePageUrl: string; candidateUrl: string; discoveredAt: string;
  discoveredVia: "schema.org/Event.image";
  rights: "unknown"; displayAllowed: false; downloadAllowed: false;
};
export type ApprovedOrganizerMedia = {
  id: string; eventSourceUrl: string; localAssetPath: string;
  reviewStatus: "pending" | "approved" | "rejected" | "revoked";
  rightsHolder: string; grantReference: string; approvedAt: string;
  expiresAt: string | null; revokedAt: string | null;
  permissions: { store: boolean; publicWebDisplay: boolean; publicProjectDistribution: boolean };
  validatedFile: { mime: "image/jpeg" | "image/png" | "image/webp" | "image/avif"; width: number; height: number; sha256: string; validatedAt: string };
  credit: string | null;
};
export type EventMediaPolicy = {
  remoteHotlinkingEnabled: boolean;
  approvedOrganizerMedia: ApprovedOrganizerMedia[];
  ownedCategoryIllustrations: { provenance: string; rightsBasis: string; mediaType: string; mandatoryNotice: string; mappings: Array<{ categories: string[]; src: string; label: string }> };
};
export type EventMediaPlan =
  | { kind: "organizer_poster"; src: string; alt: string; label: string; notice: string | null; credit: string | null; fit: "contain" }
  | { kind: "category_illustration"; src: string; alt: string; label: string; notice: string; credit: null; fit: "cover" }
  | { kind: "none"; src: null; alt: string; label: string; notice: string; credit: null; fit: null; reason: "no_approved_media" };
type Candidate = { id: string; name: string; url: string; bookingUrl: string | null; category: string | null; venueName: string | null; info: string; priceLabel: string | null };
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue => value !== null && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : {};
const first = (value: unknown) => Array.isArray(value) ? value[0] : value;

function decode(value: string): string {
  return value.replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => { const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : parseInt(code, 10); return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ""; }).replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—");
}
function text(value: unknown, limit = 300): string | null {
  return typeof value === "string" ? decode(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim().slice(0, limit) || null : null;
}
function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match ? decode(match[1]) : null;
}
function eventUrl(input: string | null): string | null {
  if (!input) return null;
  try { const url = new URL(input, SXODIM_INDEX); return url.origin === "https://sxodim.com" && !url.username && !url.password && /^\/astana\/event\/[a-z0-9-]+$/.test(url.pathname) && !url.search && !url.hash ? url.href : null; } catch { return null; }
}
function bookingUrl(input: string | null): string | null {
  if (!input) return null;
  try { const url = new URL(input, SXODIM_INDEX); return url.origin === "https://sxodim.com" && !url.username && !url.password && /^\/astana\/[a-z0-9-]+\/[a-z0-9-]+\/tickets$/.test(url.pathname) && !url.search && !url.hash ? url.href : null; } catch { return null; }
}

/** Admin-only discovery metadata. A URL is not a copyright grant or a display instruction. */
export function extractSxodimMediaCandidates(html: string, sourcePageUrl: string, discoveredAt: string): PublisherMediaCandidate[] {
  if (!eventUrl(sourcePageUrl) || !Number.isFinite(Date.parse(discoveredAt)) || new TextEncoder().encode(html).byteLength > MAX_BYTES) return [];
  const found = new Map<string, PublisherMediaCandidate>();
  const scripts = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].slice(0, 20);
  for (const script of scripts) {
    let item: ObjectValue;
    try { item = object(JSON.parse(script[1])); } catch { continue; }
    if (item["@type"] !== "Event" || eventUrl(typeof item.url === "string" ? item.url : null) !== sourcePageUrl) continue;
    for (const image of (Array.isArray(item.image) ? item.image : [item.image]).slice(0, 4)) {
      const raw = typeof image === "string" ? image : object(image).contentUrl ?? object(image).url;
      if (typeof raw !== "string") continue;
      try {
        const url = new URL(raw, sourcePageUrl);
        if (url.origin !== "https://sxodim.com" || url.username || url.password || url.search || url.hash || !/^\/uploads\/posts\/[a-z0-9/_.-]+\.(jpe?g|png|webp|avif)$/i.test(url.pathname)) continue;
        found.set(url.href, { publisher: "sxodim-astana-noncommercial", sourcePageUrl, candidateUrl: url.href, discoveredAt, discoveredVia: "schema.org/Event.image", rights: "unknown", displayAllowed: false, downloadAllowed: false });
      } catch { /* Invalid image metadata is ignored; nothing is downloaded. */ }
    }
  }
  return [...found.values()].slice(0, 4);
}

/** Server-only safe render plan. Public image and raw source/cache facts stay unchanged. */
export function resolveEventMedia(event: Pick<LiveAstanaEvent, "name" | "category" | "contactUrl">, options: { policy?: EventMediaPolicy; now?: string } = {}): EventMediaPlan {
  const policy: EventMediaPolicy = options.policy ?? defaultMediaPolicy;
  const now = Date.parse(options.now ?? new Date().toISOString());
  const safePosterPath = (path: string) => /^\/assets\/event-posters\/[a-z0-9][a-z0-9._-]{0,120}\.(jpe?g|png|webp|avif)$/i.test(path) && !path.includes("..");
  for (const item of (Array.isArray(policy.approvedOrganizerMedia) ? policy.approvedOrganizerMedia : []).slice(0, 1000)) {
    if (!item || item.eventSourceUrl !== event.contactUrl || item.reviewStatus !== "approved" || item.revokedAt !== null || typeof item.rightsHolder !== "string" || !item.rightsHolder.trim() || typeof item.grantReference !== "string" || !item.grantReference.trim() || typeof item.localAssetPath !== "string" || !safePosterPath(item.localAssetPath)) continue;
    if (!Number.isFinite(now) || !Number.isFinite(Date.parse(item.approvedAt)) || Date.parse(item.approvedAt) > now || item.expiresAt !== null && (!Number.isFinite(Date.parse(item.expiresAt)) || Date.parse(item.expiresAt) <= now)) continue;
    if (item.permissions?.store !== true || item.permissions?.publicWebDisplay !== true || item.permissions?.publicProjectDistribution !== true) continue;
    const file = item.validatedFile;
    if (!file || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.mime) || file.width < 1 || file.height < 1 || file.width > 8192 || file.height > 8192 || !Number.isInteger(file.width) || !Number.isInteger(file.height) || !/^[a-f0-9]{64}$/i.test(file.sha256) || !Number.isFinite(Date.parse(file.validatedAt)) || Date.parse(file.validatedAt) > now) continue;
    return { kind: "organizer_poster", src: item.localAssetPath, alt: `Афиша «${event.name}», предоставленная организатором с разрешением.`, label: "Афиша организатора", notice: null, credit: typeof item.credit === "string" ? item.credit : null, fit: "contain" };
  }
  const owned = policy.ownedCategoryIllustrations;
  if (owned?.mediaType === "category_illustration" && owned.rightsBasis === "project_generated_visuals" && owned.provenance === "public/assets/ideas/manifest.json" && typeof owned.mandatoryNotice === "string" && owned.mandatoryNotice.trim() && Array.isArray(owned.mappings)) {
    const category = event.category?.trim().toLowerCase();
    const match = owned.mappings.slice(0, 100).find(mapping => Array.isArray(mapping?.categories) && mapping.categories.some(alias => typeof alias === "string" && alias.trim().toLowerCase() === category));
    // Only existing project illustration slots are eligible; arbitrary local or remote URLs are denied.
    if (match && ownedIllustrations.cards.some(card => card.src === match.src)) return { kind: "category_illustration", src: match.src, alt: `Иллюстрация категории «${match.label}» — не афиша этого мероприятия.`, label: "Иллюстрация категории", notice: owned.mandatoryNotice, credit: null, fit: "cover" };
  }
  return { kind: "none", src: null, alt: "Афиша отсутствует", label: "Без афиши", notice: "Афиша не добавлена: права на изображение не подтверждены.", credit: null, fit: null, reason: "no_approved_media" };
}

/** Public index is used only to discover bounded same-origin event-page links. */
export function extractSxodimCandidates(html: string): Candidate[] {
  if (new TextEncoder().encode(html).byteLength > MAX_BYTES) throw new Error("SOURCE_DOCUMENT_TOO_LARGE");
  const starts = [...html.matchAll(/<div\b[^>]*class=["']impression-card\s*["'][^>]*>/gi)];
  if (starts.length > 120) throw new Error("SOURCE_CARD_LIMIT");
  const candidates = new Map<string, Candidate>();
  for (let index = 0; index < starts.length; index++) {
    const start = starts[index], block = html.slice(start.index, starts[index + 1]?.index ?? Math.min(html.length, start.index! + 10_000));
    const titleTag = block.match(/<a\b[^>]*class=["']impression-card-title["'][^>]*>/i)?.[0];
    const url = eventUrl(titleTag ? attr(titleTag, "href") : null), name = text(attr(start[0], "data-title"), 180), id = attr(start[0], "data-id");
    if (!url || !name || !id || !/^\d+$/.test(id)) continue;
    const info = text(block.match(/<div\b[^>]*class=["']impression-card-info["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]) ?? "";
    const links = [...block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
    // Price and venue strings are observed labels, not a guessed final cost or geocode.
    const afterTime = info.match(/\b\d{1,2}:\d{2}\s*,\s*(.+)$/)?.[1] ?? null;
    candidates.set(id, { id, name, url, bookingUrl: links.map(link => bookingUrl(link)).find(Boolean) ?? null, category: text(attr(start[0], "data-category"), 80), venueName: afterTime?.split(",")[0]?.trim() ?? null, info, priceLabel: text(attr(start[0], "data-minprice"), 30) });
  }
  return [...candidates.values()];
}

/** Discovery priority only: never used as an occurrence or exposed as an event fact. */
export function prioritizeSxodimCandidates(candidates: Candidate[], fetchedAt: string): Candidate[] {
  const clock = new Date(fetchedAt), year = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Almaty", year: "numeric" }).format(clock));
  const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const priority = (candidate: Candidate) => {
    const match = candidate.info.match(/\b(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s+(20\d{2}))?\s+в\s+(\d{1,2}):(\d{2})\b/iu);
    if (!match) return Number.MAX_SAFE_INTEGER;
    const month = monthNames.indexOf(match[2].toLowerCase()) + 1;
    const guessed = Date.parse(`${match[3] ?? year}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}T${match[4].padStart(2, "0")}:${match[5]}:00+05:00`);
    // Unknown/old date labels never outrank near-future links; JSON-LD remains the only date authority.
    return Number.isFinite(guessed) && guessed >= +clock ? guessed : Number.MAX_SAFE_INTEGER;
  };
  return [...candidates].sort((a, b) => priority(a) - priority(b));
}

function organizerUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password && !url.port && host !== "sxodim.com" && host.includes(".") && !host.endsWith(".local") && !host.endsWith(".localhost") && !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) && !host.includes(":") ? url.href : null;
  } catch { return null; }
}

function validInstant(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const time = Date.parse(value), datePart = value.slice(0, 10), calendar = new Date(`${datePart}T00:00:00Z`);
  return Number.isFinite(time) && Number.isFinite(+calendar) && calendar.toISOString().slice(0, 10) === datePart ? new Date(time).toISOString() : null;
}
function minor(value: unknown): number | null {
  const normalized = typeof value === "number" ? String(value) : typeof value === "string" ? value.replace(/[\s\u00a0]/g, "") : "";
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) ? result : null;
}

/** Parse actual Event JSON-LD and explicit venue/time labels, never execute page scripts. */
export function parseSxodimDetail(html: string, candidate: Candidate, fetchedAt: string): LiveAstanaEvent[] {
  const scripts = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const result: LiveAstanaEvent[] = [];
  const time = Date.parse(fetchedAt);
  if (!Number.isFinite(time)) throw new Error("INVALID_SOURCE_CLOCK");
  if (new TextEncoder().encode(html).byteLength > MAX_BYTES || scripts.length > 20) throw new Error("SOURCE_DOCUMENT_TOO_LARGE");
  for (const script of scripts) {
    let item: ObjectValue;
    try { item = object(JSON.parse(script[1])); } catch { continue; }
    if (item["@type"] !== "Event") continue;
    const start = validInstant(item.startDate), end = validInstant(item.endDate);
    if (!start || Date.parse(start) < time || (end && end <= start) || /EventCancelled|EventPostponed/.test(String(item.eventStatus ?? ""))) continue;
    const location = object(item.location), addressObject = object(location.address), locality = text(addressObject.addressLocality)?.toLowerCase();
    if (!["астана", "astana", "нур-султан", "nur-sultan"].includes(locality ?? "")) continue;
    const title = text(item.name, 180);
    if (!title || eventUrl(typeof item.url === "string" ? item.url : null) !== candidate.url) continue;
    const offer = object(first(item.offers));
    let priceMinor = offer.priceCurrency === "KZT" ? minor(offer.price ?? offer.lowPrice) : null;
    let kind: LiveAstanaEvent["price"]["kind"] = priceMinor === null ? "unknown" : offer.lowPrice != null ? "from" : "exact";
    const indexPrice = /тенге|теңге/i.test(candidate.info) ? minor(candidate.priceLabel) : null;
    const priceConflict = priceMinor !== null && indexPrice !== null && priceMinor !== indexPrice;
    const eventInfo = html.match(/class=["']event_date_block[^"']*["'][^>]*>([\s\S]*?)(?:class=["']favorite_btn|<div\s+class=["']single-content)/i)?.[1] ?? "";
    if (priceMinor === null && /class=["']str bold["'][^>]*>\s*Бесплатно\s*<\//i.test(eventInfo)) { priceMinor = 0; kind = "exact"; }
    // data-minprice is a minimum, never proof of an exact payable price.
    if (priceMinor === null && indexPrice !== null) { priceMinor = indexPrice; kind = "from"; }
    if (priceMinor !== null && /^(от\s|\d[\d\s]*\s+теңгеден)/i.test(candidate.info)) kind = "from";
    if (priceConflict) { priceMinor = null; kind = "unknown"; }
    const geo = object(location.geo), latNumber = typeof geo.latitude === "number" || typeof geo.latitude === "string" && geo.latitude !== "" ? Number(geo.latitude) : null, lonNumber = typeof geo.longitude === "number" || typeof geo.longitude === "string" && geo.longitude !== "" ? Number(geo.longitude) : null;
    const knownGeo = latNumber !== null && lonNumber !== null && Number.isFinite(latNumber) && Number.isFinite(lonNumber) && latNumber >= 50.9 && latNumber <= 51.35 && lonNumber >= 71.15 && lonNumber <= 71.75;
    const explicitLanguage = typeof item.inLanguage === "string" ? item.inLanguage.split("-")[0] : null;
    const language = explicitLanguage === "kk" || explicitLanguage === "ru" || explicitLanguage === "en" ? explicitLanguage : "und";
    result.push({ id: `sxodim:${candidate.id}:${start}`, name: title, cityId: "astana", category: candidate.category, venueName: candidate.venueName, address: text(addressObject.streetAddress, 350), lat: knownGeo ? latNumber : null, lon: knownGeo ? lonNumber : null,
      startsAt: start, endsAt: end, timeZone: "Asia/Almaty", durationMinutes: end ? Math.round((Date.parse(end) - Date.parse(start)) / 60_000) : null, contentLanguage: language,
      priceFromKzt: priceMinor === null ? null : priceMinor / 100, price: { kind, minMinor: priceMinor, currency: priceMinor === null ? null : "KZT", basis: "unknown" }, status: /EventScheduled|EventRescheduled/.test(String(item.eventStatus ?? "")) ? "scheduled" : "unknown", availability: "unknown",
      bookingUrl: candidate.bookingUrl, contactUrl: candidate.url, organizerUrl: organizerUrl(object(first(item.organizer)).url), image: null, requiredCredit: { text: "Давай Сходим", url: candidate.url }, fetchedAt,
      provenance: { sourceId: "sxodim-astana-noncommercial", sourceUrl: candidate.url, parserVersion: "sxodim-jsonld-v1", scheduleQuality: "observed", priceQuality: priceConflict ? "conflicting" : priceMinor === null ? "unknown" : "observed" },
      warnings: [...(!knownGeo ? ["COORDINATES_UNKNOWN"] : []), ...(!end ? ["DURATION_UNKNOWN"] : []), ...(priceMinor === null ? [priceConflict ? "PRICE_CONFLICT" : "PRICE_UNKNOWN"] : priceMinor > 0 ? ["TICKET_FEES_MAY_APPLY"] : []), "AVAILABILITY_CONFIRM_WITH_ORGANIZER", ...(language === "und" ? ["CONTENT_LANGUAGE_UNKNOWN"] : [])] });
  }
  return result;
}

/** Public fixed-domain requests only; redirect responses are never followed. */
export async function fetchSxodimDocument(url: string, fetcher: SourceFetcher = fetch): Promise<string> {
  if (![SXODIM_INDEX, SXODIM_TERMS, "https://sxodim.com/robots.txt"].includes(url) && !eventUrl(url)) throw new Error("SOURCE_URL_NOT_ALLOWLISTED");
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetcher(url, { redirect: "manual", signal: controller.signal, headers: { Accept: "text/html,text/plain;q=0.9", "User-Agent": "QETTYQ-Noncommercial-Pilot/0.1 (+https://github.com/timyname/QETTYQ)" } });
    if (!response.ok) throw new Error(response.status === 429 ? "SOURCE_RATE_LIMITED" : `SOURCE_HTTP_${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!/^(text\/html|text\/plain)/i.test(contentType)) throw new Error("SOURCE_CONTENT_TYPE_INVALID");
    if (Number(response.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("SOURCE_DOCUMENT_TOO_LARGE");
    if (!response.body) throw new Error("SOURCE_EMPTY_BODY");
    const reader = response.body.getReader(), decoder = new TextDecoder(); let size = 0, document = "";
    try { while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > MAX_BYTES) { await reader.cancel(); throw new Error("SOURCE_DOCUMENT_TOO_LARGE"); } document += decoder.decode(chunk.value, { stream: true }); } } finally { reader.releaseLock(); }
    return document + decoder.decode();
  } finally { clearTimeout(timer); }
}

/** One refresh: robots + permission check, index, at most eight sequential event pages. */
export async function fetchLiveAstanaEvents(options: { fetcher?: SourceFetcher; now?: string; onMediaCandidates?: (candidates: PublisherMediaCandidate[]) => void | Promise<void> } = {}): Promise<SxodimSnapshot> {
  const fetcher = options.fetcher ?? fetch, fetchedAt = options.now ?? new Date().toISOString();
  const robots = await fetchSxodimDocument("https://sxodim.com/robots.txt", fetcher);
  if (!/^User-agent:\s*\*\s*\r?\nDisallow:\s*$/i.test(robots.trim())) throw new Error("SOURCE_ROBOTS_POLICY_REQUIRES_REVIEW");
  const terms = text(await fetchSxodimDocument(SXODIM_TERMS, fetcher), MAX_BYTES) ?? "";
  if (!/разрешаем вам использовать материалы этого сайта/i.test(terms) || !/не зарабатываете на этом деньги/i.test(terms) || !/упомянуть нас как авторов и ставить ссылки/i.test(terms)) throw new Error("SOURCE_REUSE_POLICY_REQUIRES_REVIEW");
  const candidates = extractSxodimCandidates(await fetchSxodimDocument(SXODIM_INDEX, fetcher));
  if (!candidates.length) throw new Error("SOURCE_MARKUP_CHANGED");
  // Prefer explicitly timed listings; detail JSON-LD, not index date inference, decides applicability.
  const selected = prioritizeSxodimCandidates(candidates.filter(candidate => /\b\d{1,2}:\d{2}\b/.test(candidate.info)), fetchedAt).slice(0, MAX_DETAILS);
  const events = new Map<string, LiveAstanaEvent>(); let rejected = 0;
  for (const candidate of selected) {
    try {
      const html = await fetchSxodimDocument(candidate.url, fetcher);
      const items = parseSxodimDetail(html, candidate, fetchedAt);
      if (!items.length) rejected++;
      for (const item of items) events.set(item.id, item);
      if (items.length && options.onMediaCandidates) {
        try { await options.onMediaCandidates(extractSxodimMediaCandidates(html, candidate.url, fetchedAt)); } catch { /* Admin metadata failure must not erase valid event facts. */ }
      }
    } catch (error) { if (error instanceof Error && error.message === "SOURCE_RATE_LIMITED") throw error; rejected++; }
  }
  if (!events.size) throw new Error("SOURCE_NO_CONFIRMED_UPCOMING_EVENTS");
  return { source: { id: "sxodim-astana-noncommercial", name: "Давай Сходим", url: SXODIM_INDEX, termsUrl: SXODIM_TERMS, reuse: "noncommercial_with_credit", mediaCopied: false }, fetchedAt, expiresAt: new Date(Date.parse(fetchedAt) + EVENT_REFRESH_MS).toISOString(), items: [...events.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt)), coverage: { indexCandidates: candidates.length, detailPagesRequested: selected.length, importedOccurrences: events.size, rejected, scope: "At most eight explicitly timed public listings prioritized by near-date labels; occurrences verified only in Event JSON-LD. Not a complete city calendar. No photographs copied." } };
}
