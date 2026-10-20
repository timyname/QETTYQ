import { afterEach, describe, expect, it, vi } from "vitest";
import { extractSxodimCandidates, fetchLiveAstanaEvents, fetchSxodimDocument, parseSxodimDetail, EVENT_REFRESH_MS, SXODIM_INDEX, SXODIM_TERMS, type SxodimSnapshot, type SourceFetcher } from "../../src/server/ingestion/sxodim-live";
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
  it("fails closed when robots or reuse terms change", async () => {
    await expect(fetchLiveAstanaEvents({ fetcher: async () => response("User-agent: *\nDisallow: /\n"), now: new Date(now).toISOString() })).rejects.toThrow("SOURCE_ROBOTS_POLICY_REQUIRES_REVIEW");
    const fetcher = vi.fn(async (url: string) => response(url.endsWith("robots.txt") ? "User-agent: *\nDisallow:\n" : "All rights reserved"));
    await expect(fetchLiveAstanaEvents({ fetcher, now: new Date(now).toISOString() })).rejects.toThrow("SOURCE_REUSE_POLICY_REQUIRES_REVIEW");
    expect(fetcher).toHaveBeenCalledTimes(2);
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
});
