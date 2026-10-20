import { afterEach, describe, expect, it, vi } from "vitest";
import { extractSxodimCandidates, prioritizeSxodimCandidates, extractSxodimMediaCandidates, resolveEventMedia, fetchLiveAstanaEvents, fetchSxodimDocument, parseSxodimDetail, EVENT_REFRESH_MS, SXODIM_INDEX, SXODIM_TERMS, type ApprovedOrganizerMedia, type EventMediaPolicy, type SxodimSnapshot, type SourceFetcher } from "../../src/server/ingestion/sxodim-live";
import mediaPolicy from "../../data/media-policy.json";
import { cloudflareEventCache, createLiveEventsService, liveEventsService } from "../../src/server/ingestion/live-events";
import { GET } from "../../src/app/api/events/route";

const now = Date.parse("2026-10-20T11:00:00.000Z"), page = "https://sxodim.com/astana/event/synthetic-test-event";
const index = `<div class="impression-card " data-id="123" data-title="SYNTHETIC TEST event" data-category="Образование" data-minprice=""><a href="${page}" class="impression-card-title">test</a><div class="impression-card-info">23 октября в 18:30, Test venue, Test address</div></div>`;
const candidate = extractSxodimCandidates(index)[0];
const event = { "@type": "Event", url: page, name: "SYNTHETIC TEST event", startDate: "2026-10-23T18:30:00+05:00", eventStatus: "https://schema.org/EventScheduled", location: { address: { addressLocality: "Астана", streetAddress: "Synthetic address" } } };
const detail = (patch = {}, suffix = "") => `<script type="application/ld+json">${JSON.stringify({ ...event, ...patch })}</script>${suffix}`;
const permission = "Мы разрешаем вам использовать материалы этого сайта во всех благих целях, если вы не зарабатываете на этом деньги и не забываете упомянуть нас как авторов и ставить ссылки.";
const response = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/html" } });
const snap = (at = now): SxodimSnapshot => ({ source: { id: "sxodim-astana-noncommercial", name: "Давай Сходим", url: SXODIM_INDEX, termsUrl: SXODIM_TERMS, reuse: "noncommercial_with_credit", mediaCopied: false }, fetchedAt: new Date(at).toISOString(), expiresAt: new Date(at + EVENT_REFRESH_MS).toISOString(), items: parseSxodimDetail(detail(), candidate, new Date(at).toISOString()), coverage: { indexCandidates: 1, detailPagesRequested: 1, importedOccurrences: 1, rejected: 0, scope: "Synthetic fixture only" } });
const noCache = { read: async () => null, write: async () => undefined };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("live source normalization (synthetic, no external requests)", () => {
  it("extracts same-origin public event links but not private/internal endpoints", () => {
    expect(candidate.url).toBe(page);
    expect(extractSxodimCandidates(index.replaceAll(page, "https://other.example/event/test"))).toHaveLength(0);
    expect(extractSxodimCandidates(index.replaceAll(page, "https://sxodim.com/admin/test"))).toHaveLength(0);
  });
  it("takes an actual ISO occurrence from Event JSON-LD, not inferred index dates", () => {
    const item = parseSxodimDetail(detail(), candidate, new Date(now).toISOString())[0];
    expect(item.startsAt).toBe("2026-10-23T13:30:00.000Z");
    expect(item.endsAt).toBeNull();
    expect(item.priceFromKzt).toBeNull();
    expect(item.lat).toBeNull();
    expect(item.lon).toBeNull();
    expect(item.contentLanguage).toBe("und");
    expect(item.image).toBeNull();
    expect(item.requiredCredit.url).toBe(page);
  });
  it.each(["2026-10-23", "2026-10-23T18:30:00", "2026-02-30T18:30:00+05:00", "2026-10-19T18:30:00+05:00"]) ("does not promote invalid, ambiguous or past occurrence %s", (startDate) => {
    expect(parseSxodimDetail(detail({ startDate }), candidate, new Date(now).toISOString())).toHaveLength(0);
  });
  it("never promotes news Article JSON-LD or a cancellation into an upcoming event", () => {
    expect(parseSxodimDetail(detail({ "@type": "Article" }), candidate, new Date(now).toISOString())).toHaveLength(0);
    expect(parseSxodimDetail(detail({ eventStatus: "https://schema.org/EventCancelled" }), candidate, new Date(now).toISOString())).toHaveLength(0);
  });
  it("sets known zero only when explicit free text is in the event-info block", () => {
    const free = `<div class="event_date_block"><div class="str bold">Бесплатно</div></div><div class="favorite_btn">`;
    expect(parseSxodimDetail(detail({}, free), candidate, new Date(now).toISOString())[0].price.minMinor).toBe(0);
    expect(parseSxodimDetail(detail({}, "<footer>Бесплатно</footer>"), candidate, new Date(now).toISOString())[0].price.minMinor).toBeNull();
  });
  it("preserves from-price and quarantines disagreement between index and structured offer", () => {
    const priced = { ...candidate, priceLabel: "3 000", info: "от 3000 тенге, 23 октября в 18:30, Venue" };
    const same = parseSxodimDetail(detail({ offers: { price: "3000", priceCurrency: "KZT" } }), priced, new Date(now).toISOString())[0];
    expect(same.price.kind).toBe("from");
    const conflict = parseSxodimDetail(detail({ offers: { price: "5000", priceCurrency: "KZT" } }), priced, new Date(now).toISOString())[0];
    expect(conflict.priceFromKzt).toBeNull();
    expect(conflict.provenance.priceQuality).toBe("conflicting");
    expect(conflict.warnings).toContain("PRICE_CONFLICT");
  });
  it("treats index data-minprice as from even if the visible label omits the word от", () => {
    const priced = { ...candidate, priceLabel: "9 900", info: "9900 теңге, 23 октября в 18:30, Venue" };
    const item = parseSxodimDetail(detail(), priced, new Date(now).toISOString())[0];
    expect(item.price.kind).toBe("from");
    expect(item.price.basis).toBe("unknown");
    expect(item.price.minMinor).toBe(990000);
  });
  it("keeps explicitly published language and coordinates, without geocoding unknown fields", () => {
    const item = parseSxodimDetail(detail({ inLanguage: "kk-KZ", location: { address: { addressLocality: "Astana" }, geo: { latitude: 51.15, longitude: 71.43 } } }), candidate, new Date(now).toISOString())[0];
    expect(item.contentLanguage).toBe("kk");
    expect(item.lat).toBe(51.15);
  });
  it("prioritizes near-date index links instead of promoted distant cards, without inventing occurrence dates", () => {
    const promo = { ...candidate, id: "promo", info: "7 ноября в 19:00, Synthetic venue" };
    const today = { ...candidate, id: "today", info: "20 октября в 19:00, Synthetic venue" };
    const old = { ...candidate, id: "old", info: "19 октября в 19:00, Synthetic venue" };
    expect(prioritizeSxodimCandidates([promo, old, today], new Date(now).toISOString()).map(x => x.id)).toEqual(["today", "promo", "old"]);
    expect(parseSxodimDetail(detail({ startDate: "not-an-occurrence" }), today, new Date(now).toISOString())).toEqual([]);
  });
  it("keeps an explicit organizer website separate from aggregator and rejects private/unsafe links", () => {
    const get = (organizer: unknown) => parseSxodimDetail(detail({ organizer }), candidate, new Date(now).toISOString())[0];
    expect(get({ url: "https://organizer.example/event" }).organizerUrl).toBe("https://organizer.example/event");
    expect(get({ url: page }).organizerUrl).toBeNull();
    expect(get({ url: "https://127.0.0.1/private" }).organizerUrl).toBeNull();
    expect(get({ url: "https://user:pass@organizer.example" }).organizerUrl).toBeNull();
    expect(get(undefined).organizerUrl).toBeNull();
    expect(get({ url: "https://organizer.example/event" }).contactUrl).toBe(page);
  });
});

describe("bounded public fetch adapter", () => {
  it("refuses arbitrary URLs without making a request", async () => {
    const fetcher = vi.fn();
    await expect(fetchSxodimDocument("https://127.0.0.1/private", fetcher)).rejects.toThrow("SOURCE_URL_NOT_ALLOWLISTED");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not follow redirects or accept oversized/malformed body types", async () => {
    const fetcher = vi.fn<SourceFetcher>(async () => response("", 302));
    await expect(fetchSxodimDocument(SXODIM_INDEX, fetcher)).rejects.toThrow("SOURCE_HTTP_302");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
    await expect(fetchSxodimDocument(SXODIM_INDEX, async () => response("x".repeat(512001)))).rejects.toThrow("SOURCE_DOCUMENT_TOO_LARGE");
  });
  it("fetches permission/robots/index/detail and never downloads a poster", async () => {
    const fetcher = vi.fn(async (url: string) => response(url.endsWith("robots.txt") ? "User-agent: *\nDisallow:\n" : url === SXODIM_TERMS ? permission : url === SXODIM_INDEX ? index : detail()));
    const data = await fetchLiveAstanaEvents({ fetcher, now: new Date(now).toISOString() });
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(data.items).toHaveLength(1);
    expect(data.source.mediaCopied).toBe(false);
  });
  it("caps the same-index serial refresh at 24 details and reports actual calls, never photos", async () => {
    const listing = Array.from({ length: 30 }, (_, i) => index.replace('data-id="123"', `data-id="${1000 + i}"`).replaceAll(page, `https://sxodim.com/astana/event/synthetic-${i}`)).join("");
    let inFlight = 0, peak = 0;
    const fetcher = vi.fn<SourceFetcher>(async url => {
      inFlight++; peak = Math.max(peak, inFlight); await Promise.resolve(); inFlight--;
      return response(url.endsWith("robots.txt") ? "User-agent: *\nDisallow:\n" : url === SXODIM_TERMS ? permission : url === SXODIM_INDEX ? listing : detail({ url }));
    });
    const snapshot = await fetchLiveAstanaEvents({ fetcher, now: new Date(now).toISOString() });
    expect(snapshot.items).toHaveLength(24); expect(snapshot.coverage).toMatchObject({ indexCandidates: 30, detailPagesRequested: 24, importedOccurrences: 24 });
    expect(fetcher).toHaveBeenCalledTimes(27); expect(peak).toBe(1);
    expect(fetcher.mock.calls.every(([url]) => !url.includes("uploads"))).toBe(true);
  });
  it("caps multi-occurrence pages at 50 records without claiming all selected pages were fetched", async () => {
    const listing = Array.from({ length: 24 }, (_, i) => index.replace('data-id="123"', `data-id="${1000 + i}"`).replaceAll(page, `https://sxodim.com/astana/event/synthetic-${i}`)).join("");
    const fetcher = vi.fn<SourceFetcher>(async url => response(url.endsWith("robots.txt") ? "User-agent: *\nDisallow:\n" : url === SXODIM_TERMS ? permission : url === SXODIM_INDEX ? listing
      : Array.from({ length: 20 }, (_, i) => detail({ url, startDate: new Date(Date.parse("2026-10-23T13:30:00Z") + i * 86400_000).toISOString().replace(".000Z", "Z") })).join("")));
    const snapshot = await fetchLiveAstanaEvents({ fetcher, now: new Date(now).toISOString() });
    expect(snapshot.items).toHaveLength(50); expect(snapshot.coverage.detailPagesRequested).toBe(3); expect(fetcher).toHaveBeenCalledTimes(6);
  });
  it.each([403, 429])("stops on detail HTTP%s instead of retrying or working around a block", async status => {
    const fetcher = vi.fn<SourceFetcher>(async url => response(url.endsWith("robots.txt") ? "User-agent: *\nDisallow:\n" : url === SXODIM_TERMS ? permission : url === SXODIM_INDEX ? index : "blocked", url.startsWith(`${SXODIM_INDEX}/event/`) ? status : 200));
    await expect(fetchLiveAstanaEvents({ fetcher, now: new Date(now).toISOString() })).rejects.toThrow(status === 429 ? "SOURCE_RATE_LIMITED" : "SOURCE_HTTP_403");
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it("fails closed when robots or reuse terms change", async () => {
    await expect(fetchLiveAstanaEvents({ fetcher: async () => response("User-agent: *\nDisallow: /\n"), now: new Date(now).toISOString() })).rejects.toThrow("SOURCE_ROBOTS_POLICY_REQUIRES_REVIEW");
    const fetcher = vi.fn(async (url: string) => response(url.endsWith("robots.txt") ? "User-agent: *\nDisallow:\n" : "All rights reserved"));
    await expect(fetchLiveAstanaEvents({ fetcher, now: new Date(now).toISOString() })).rejects.toThrow("SOURCE_REUSE_POLICY_REQUIRES_REVIEW");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("rights-aware event media (synthetic fixtures, no media requests)", () => {
  const at = new Date(now).toISOString();
  const imageUrl = "https://sxodim.com/uploads/posts/2026/10/synthetic.jpg";
  const mediaEvent = { name: "SYNTHETIC TEST event", category: "Театр", contactUrl: page };
  const approved = (): ApprovedOrganizerMedia => ({ id: "synthetic-approval", eventSourceUrl: page, localAssetPath: "/assets/event-posters/synthetic-approved.jpg", reviewStatus: "approved", rightsHolder: "Synthetic owner", grantReference: "private:synthetic-evidence", approvedAt: "2026-10-19T10:00:00Z", expiresAt: null, revokedAt: null, permissions: { store: true, publicWebDisplay: true, publicProjectDistribution: true }, validatedFile: { mime: "image/jpeg", width: 720, height: 960, sha256: "a".repeat(64), validatedAt: "2026-10-19T10:00:00Z" }, credit: "Synthetic owner" });
  const policy = (poster = approved()): EventMediaPolicy => ({ ...mediaPolicy, approvedOrganizerMedia: [poster] });

  it("records only admin discovery metadata, never a permission to copy or display", () => {
    const candidates = extractSxodimMediaCandidates(detail({ image: imageUrl }), page, at);
    expect(candidates).toEqual([{ publisher: "sxodim-astana-noncommercial", sourcePageUrl: page, candidateUrl: imageUrl, discoveredAt: at, discoveredVia: "schema.org/Event.image", rights: "unknown", displayAllowed: false, downloadAllowed: false }]);
    expect(parseSxodimDetail(detail({ image: imageUrl }), candidate, at)[0].image).toBeNull();
  });
  it.each(["https://other.example/poster.jpg", "https://sxodim.com/uploads/posts/test.svg", "https://user:pass@sxodim.com/uploads/posts/test.jpg", "https://sxodim.com/uploads/posts/test.jpg?token=x"]) ("refuses unapproved candidate metadata URL %s", image => {
    expect(extractSxodimMediaCandidates(detail({ image }), page, at)).toEqual([]);
  });
  it("requires matching Event/source and bounds discoveries", () => {
    expect(extractSxodimMediaCandidates(detail({ image: imageUrl, "@type": "Article" }), page, at)).toEqual([]);
    expect(extractSxodimMediaCandidates(detail({ image: imageUrl, url: page + "-other" }), page, at)).toEqual([]);
    expect(extractSxodimMediaCandidates(detail({ image: Array.from({ length: 8 }, (_, i) => imageUrl.replace("synthetic", `synthetic-${i}`)) }), page, at)).toHaveLength(4);
  });
  it("discovers from the already fetched HTML without additional requests or public leakage", async () => {
    const fetcher = vi.fn(async (url: string) => response(url.endsWith("robots.txt") ? "User-agent: *\nDisallow:\n" : url === SXODIM_TERMS ? permission : url === SXODIM_INDEX ? index : detail({ image: imageUrl })));
    const hook = vi.fn();
    const data = await fetchLiveAstanaEvents({ fetcher, now: at, onMediaCandidates: hook });
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(hook).toHaveBeenCalledOnce();
    expect(hook.mock.calls[0][0][0].candidateUrl).toBe(imageUrl);
    expect(JSON.stringify(data)).not.toContain(imageUrl);
    expect(data.items[0].image).toBeNull();
  });
  it("does not erase source facts if admin discovery storage fails", async () => {
    const fetcher = async (url: string) => response(url.endsWith("robots.txt") ? "User-agent: *\nDisallow:\n" : url === SXODIM_TERMS ? permission : url === SXODIM_INDEX ? index : detail({ image: imageUrl }));
    const data = await fetchLiveAstanaEvents({ fetcher, now: at, onMediaCandidates: () => { throw Error("synthetic storage failure"); } });
    expect(data.items).toHaveLength(1);
  });
  it("uses labeled owned category art, not a source poster or fabricated event photo", () => {
    const result = resolveEventMedia(mediaEvent, { now: at });
    expect(result).toMatchObject({ kind: "category_illustration", src: "/assets/ideas/03-ballet-theatre.jpg", label: "Иллюстрация категории", notice: "Иллюстрация категории, не афиша мероприятия", fit: "cover", credit: null });
    expect(result.alt).toContain("не афиша");
    expect(resolveEventMedia({ ...mediaEvent, category: "Бизнес" }, { now: at })).toMatchObject({ kind: "none", src: null, label: "Без афиши", fit: null });
  });
  it("rejects a made-up illustration filename even with an eligible category", () => {
    const custom = policy(); custom.approvedOrganizerMedia = [];
    custom.ownedCategoryIllustrations = { ...custom.ownedCategoryIllustrations, mappings: [{ categories: ["Театр"], src: "/assets/ideas/03-fake.jpg", label: "Test" }] };
    expect(resolveEventMedia(mediaEvent, { policy: custom, now: at }).kind).toBe("none");
  });
  it("prefers a bound approved local organizer poster without exposing evidence references", () => {
    const result = resolveEventMedia(mediaEvent, { policy: policy(), now: at });
    expect(result).toMatchObject({ kind: "organizer_poster", src: "/assets/event-posters/synthetic-approved.jpg", label: "Афиша организатора", fit: "contain", credit: "Synthetic owner" });
    expect(JSON.stringify(result)).not.toContain("private:");
  });
  it.each(["pending", "revoked", "expired", "wrong-event", "missing-permission", "remote", "bad-file", "missing-record"]) ("fails closed for %s organizer media", reason => {
    const poster = approved();
    if (reason === "pending") poster.reviewStatus = "pending";
    if (reason === "revoked") poster.revokedAt = "2026-10-20T10:00:00Z";
    if (reason === "expired") poster.expiresAt = at;
    if (reason === "wrong-event") poster.eventSourceUrl += "-other";
    if (reason === "missing-permission") poster.permissions.publicProjectDistribution = false;
    if (reason === "remote") poster.localAssetPath = imageUrl;
    if (reason === "bad-file") poster.validatedFile.sha256 = "not-a-hash";
    if (reason === "missing-record") delete (poster as Partial<ApprovedOrganizerMedia>).validatedFile;
    expect(resolveEventMedia(mediaEvent, { policy: policy(poster), now: at }).kind).toBe("category_illustration");
  });
});

describe("hourly event cache", () => {
  it("shares concurrent refreshes and serves a dated cached hit without network", async () => {
    const load = vi.fn(async () => snap());
    const service = createLiveEventsService({ now: () => now, load, cache: noCache, fallback: null });
    const [one, two] = await Promise.all([service.get(), service.get()]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(one).toEqual(two);
    expect(one.dataMode).toBe("live");
    expect((await service.get()).cacheStatus).toBe("hit");
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("revalidates on request after one hour and does not silently extend source freshness", async () => {
    let clock = now;
    const load = vi.fn(async () => snap(clock));
    const service = createLiveEventsService({ now: () => clock, load, cache: noCache, fallback: null });
    await service.get(); clock += EVENT_REFRESH_MS + 1;
    await service.get();
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("marks provider failure as stale snapshot and applies an hourly retry floor", async () => {
    const load = vi.fn(async () => { throw Error("SOURCE_HTTP_503"); });
    const service = createLiveEventsService({ now: () => now, load, cache: noCache, fallback: snap(now - EVENT_REFRESH_MS * 2) });
    const result = await service.get(); await service.get();
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.dataMode).toBe("snapshot");
    expect(result.freshness).toBe("stale");
  });
  it("does not turn a bundled fresh fixture into live data when the provider fails", async () => {
    const result = await createLiveEventsService({ now: () => now, load: async () => { throw Error("offline"); }, cache: noCache, fallback: snap() }).get();
    expect(result.dataMode).toBe("snapshot");
    expect(result.cacheStatus).toBe("stale-fallback");
  });
  it("does not republish a fallback when the source reuse policy no longer matches", async () => {
    const service = createLiveEventsService({ now: () => now, load: async () => { throw Error("SOURCE_REUSE_POLICY_REQUIRES_REVIEW"); }, cache: noCache, fallback: snap() });
    expect((await service.get()).items).toEqual([]);
    expect((await service.get()).dataMode).toBe("unavailable");
  });
  it("reports unavailable instead of inventing a dataset when there is no last-good snapshot", async () => {
    const result = await createLiveEventsService({ now: () => now, load: async () => { throw Error("offline"); }, cache: noCache, fallback: null }).get();
    expect(result.dataMode).toBe("unavailable");
    expect(result.items).toEqual([]);
  });
  it("uses Cloudflare Cache API when present and stores last-good snapshot separately from expiresAt", async () => {
    const put = vi.fn(async () => undefined), match = vi.fn(async () => Response.json(snap()));
    vi.stubGlobal("caches", { default: { put, match } });
    const cache = cloudflareEventCache();
    expect((await cache.read())?.items).toHaveLength(1);
    await cache.write(snap());
    expect(put).toHaveBeenCalledTimes(1);
  });
});

describe("events API", () => {
  it("validates unsupported city and invalid dates before calling a source", async () => {
    const get = vi.spyOn(liveEventsService, "get");
    expect((await GET(new Request("https://qettyq.example/api/events?city=almaty"))).status).toBe(400);
    expect((await GET(new Request("https://qettyq.example/api/events?date=2026-02-30"))).status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });
  it("filters by Astana local date while preserving attribution and freshness", async () => {
    const fixture = snap();
    vi.spyOn(liveEventsService, "get").mockResolvedValue({ ...fixture, dataMode: "live", freshness: "fresh", cacheStatus: "hit", warnings: [] });
    const result = await GET(new Request("https://qettyq.example/api/events?date=2026-10-23"));
    const body = await result.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].requiredCredit.text).toBe("Давай Сходим");
    expect(body.fetchedAt).toBe(fixture.fetchedAt);
    expect(result.headers.get("cache-control")).toContain("no-store");
  });
  it("adds safe media only to response items, preserving null images and raw cache DTO", async () => {
    const fixture = snap(); fixture.items[0].category = "Театр";
    vi.spyOn(liveEventsService, "get").mockResolvedValue({ ...fixture, dataMode: "live", freshness: "fresh", cacheStatus: "hit", warnings: [] });
    const body = await (await GET(new Request("https://qettyq.example/api/events"))).json();
    expect(body.items[0].media.kind).toBe("category_illustration");
    expect(body.items[0].image).toBeNull();
    expect(body.items[0].requiredCredit.text).toBe("Давай Сходим");
    expect(fixture.items[0]).not.toHaveProperty("media");
    expect(JSON.stringify(body)).not.toContain("candidateUrl");
  });
  it("keeps provider failure explicitly unavailable and does not invent media/events", async () => {
    vi.spyOn(liveEventsService, "get").mockResolvedValue({ ...snap(), items: [], dataMode: "unavailable", freshness: "unavailable", cacheStatus: "miss", warnings: ["SOURCE_HTTP_503"] });
    const result = await GET(new Request("https://qettyq.example/api/events"));
    const body = await result.json();
    expect(result.status).toBe(503); expect(body.items).toEqual([]); expect(body.freshness).toBe("unavailable");
  });
  it("does not relabel a stale fallback as live when adding media", async () => {
    const fixture = snap(); fixture.items[0].category = "Театр";
    vi.spyOn(liveEventsService, "get").mockResolvedValue({ ...fixture, dataMode: "snapshot", freshness: "stale", cacheStatus: "stale-fallback", warnings: ["SOURCE_HTTP_503"] });
    const body = await (await GET(new Request("https://qettyq.example/api/events"))).json();
    expect(body.dataMode).toBe("snapshot"); expect(body.freshness).toBe("stale");
    expect(body.items[0].media.kind).toBe("category_illustration");
  });
});
