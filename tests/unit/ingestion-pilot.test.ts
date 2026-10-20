import { describe, expect, it } from "vitest";
import { eventIsDiscoverable, mergeEventSnapshots, parseEventDocument, publicHttpsUrl, toPublicEvent, type EventSourcePolicy } from "../../src/server/ingestion/events";
import { fetchApprovedEventDocument, isPublicIpv4 } from "../../src/server/ingestion/fetch";

const now = "2026-10-20T10:00:00.000Z";
const url = "https://organizer.example/events/test";
const policy: EventSourcePolicy = { id: "synthetic-owned", name: "Synthetic organizer", status: "approved_for_scope", evidenceUrl: "https://organizer.example/permission", allowedUrls: [url], allowFetch: false, allowPersist: true, allowDisplay: true, allowDescription: false, allowMediaDisplay: false, allowMediaDownload: false, mediaLicense: null, requiredCredit: null, robotsReviewedAt: null, minimumRefreshMinutes: 60, maxAgeMinutes: 1440 };
const source = { "@type": "Event", "@id": "stable-event-1", name: "SYNTHETIC TEST · Astana craft workshop", startDate: "2026-10-21T19:00:00+05:00", endDate: "2026-10-21T20:00:00+05:00", location: { "@type": "Place", name: "SYNTHETIC TEST venue", address: { streetAddress: "Synthetic address", addressLocality: "Astana" }, geo: { latitude: 51.15, longitude: 71.43 } }, image: "https://organizer.example/poster.jpg" };
const parse = (overrides: Record<string, unknown> = {}, options = { now }) => parseEventDocument(JSON.stringify({ ...source, ...overrides }), policy, url, options);

describe("bounded pilot event ingestion (synthetic fixtures, no network)", () => {
  it("converts an explicitly offset time to UTC without guessing content language or price", () => {
    const event = parse().records[0];
    expect(event.startsAt).toBe("2026-10-21T14:00:00.000Z");
    expect(event.timeZone).toBe("Asia/Almaty");
    expect(event.price.minMinor).toBeNull();
    expect(event.price.kind).toBe("unknown");
    expect(event.contentLanguages).toEqual([]);
    expect(event.availability).toBe("unknown");
    expect(event.status).toBe("unknown");
  });
  it("preserves date-only events without inventing a midnight showtime", () => {
    const event = parse({ startDate: "2026-10-21", endDate: null }).records[0];
    expect(event.localDate).toBe("2026-10-21");
    expect(event.startsAt).toBeNull();
    expect(eventIsDiscoverable(event, now)).toBe(false);
  });
  it.each(["2026-10-21T19:00:00", "21.10.2026", "2026-02-30T19:00:00+05:00", "2026-02-30"]) ("quarantines ambiguous/invalid date %s", (startDate) => {
    expect(parse({ startDate }).records).toHaveLength(0);
    expect(parse({ startDate }).rejected[0].reason).toBe("INVALID_OR_AMBIGUOUS_DATE");
  });
  it("reads JSON-LD only, never executes JS or fetches linked documents", () => {
    const html = `<script>throw new Error('not executed')</script><script type="application/ld+json">${JSON.stringify({ "@graph": [source] })}</script>`;
    expect(parseEventDocument(html, policy, url, { now }).records).toHaveLength(1);
  });
  it("treats an explicit zero as known and preserves unknown purchase basis", () => {
    const event = parse({ offers: { price: "0", priceCurrency: "KZT" } }).records[0];
    expect(event.price).toEqual({ kind: "exact", minMinor: 0, maxMinor: 0, currency: "KZT", basis: "unknown" });
  });
  it("uses integer minor units and distinguishes from-price from a guaranteed total", () => {
    const event = parse({ offers: { lowPrice: "2500.50", priceCurrency: "KZT" } }).records[0];
    expect(event.price).toMatchObject({ kind: "from", minMinor: 250050, maxMinor: null });
    expect(parse({ offers: { price: "-100", priceCurrency: "KZT" } }).records[0].price.kind).toBe("unknown");
  });
  it("does not infer stage/audio language from a Russian title", () => {
    expect(parse({ name: "Тестовый спектакль" }).records[0].contentLanguages).toEqual([]);
    expect(parse({ inLanguage: ["kk-KZ", "en"] }).records[0].contentLanguages).toEqual(["kk", "en"]);
  });
  it("keeps poster metadata admin-only until image rights are approved", () => {
    const event = parse().records[0];
    expect(event.image?.sourceUrl).toContain("poster.jpg");
    expect(event.image?.displayUrl).toBeNull();
    expect(event.image?.downloadAllowed).toBe(false);
    expect(toPublicEvent(event).image).toBeNull();
  });
  it("requires explicit image rights and retains mandatory publisher attribution", () => {
    const approved = { ...policy, allowMediaDisplay: true, allowMediaDownload: true, mediaLicense: "organizer-permission", requiredCredit: "Synthetic organizer" };
    const event = parseEventDocument(JSON.stringify(source), approved, url, { now }).records[0];
    expect(toPublicEvent(event).image?.url).toContain("poster.jpg");
    expect(event.image?.downloadAllowed).toBe(true);
    expect(toPublicEvent(event).requiredCredit).toEqual({ text: "Synthetic organizer", url });
  });
  it("redacts internal provenance but retains booking and organizer links", () => {
    const event = parse({ offers: { url: "https://organizer.example/book" }, organizer: { name: "Test organizer", url: "https://organizer.example/" } }).records[0];
    expect(toPublicEvent(event)).not.toHaveProperty("provenance");
    expect(toPublicEvent(event).bookingUrl).toBe("https://organizer.example/book");
    expect(toPublicEvent(event).organizer.url).toBe("https://organizer.example/");
  });
  it("does not accept a candidate source or a non-allowlisted URL", () => {
    expect(() => parseEventDocument(JSON.stringify(source), { ...policy, status: "candidate" }, url, { now })).toThrow("SOURCE_POLICY_NOT_APPROVED");
    expect(() => parseEventDocument(JSON.stringify(source), policy, "https://other.example/event", { now })).toThrow("SOURCE_URL_NOT_ALLOWLISTED");
  });
  it("does not silently map an event from Almaty onto Astana", () => {
    expect(parse({ location: { address: { addressLocality: "Almaty" }, geo: { latitude: 43.25, longitude: 76.95 } } }).records).toHaveLength(0);
    expect(parse({ location: { name: "Unknown venue" } }).rejected[0].reason).toBe("CITY_NOT_VERIFIED");
  });
  it("does idempotent upsert and records a reschedule against the stable source ID", () => {
    const original = parse().records;
    expect(mergeEventSnapshots(original, original).records).toHaveLength(1);
    const changed = parse({ startDate: "2026-10-22T19:00:00+05:00", endDate: null }, { now: "2026-10-20T11:00:00.000Z" }).records;
    expect(mergeEventSnapshots(original, changed).changes).toHaveLength(1);
    expect(mergeEventSnapshots(changed, original).records[0].startsAt).toBe(changed[0].startsAt);
    expect(mergeEventSnapshots(original, []).records).toHaveLength(1);
  });
  it("excludes expired, cancelled, sold-out and synthetic records from upcoming live discovery", () => {
    const event = parse().records[0];
    expect(eventIsDiscoverable(event, now)).toBe(true);
    expect(eventIsDiscoverable(event, "2026-10-21T12:00:00.000Z")).toBe(false);
    expect(eventIsDiscoverable({ ...event, status: "cancelled" }, now)).toBe(false);
    expect(eventIsDiscoverable({ ...event, availability: "sold_out" }, now)).toBe(false);
    expect(eventIsDiscoverable({ ...event, dataMode: "synthetic_test" }, now)).toBe(false);
  });
  it("strips HTML and refuses oversized source documents", () => {
    const event = parse({ name: "<b>Test</b><script>secret()</script>", description: "Do not copy" }).records[0];
    expect(event.name).toBe("Test");
    expect(event.description).toBeNull();
    expect(() => parseEventDocument("x".repeat(512001), policy, url, { now })).toThrow("DOCUMENT_TOO_LARGE");
  });
  it("blocks network fetches by default and honors the refresh floor before networking", async () => {
    await expect(fetchApprovedEventDocument(policy, url, null, now)).rejects.toThrow("FETCH_POLICY_NOT_APPROVED");
    await expect(fetchApprovedEventDocument({ ...policy, allowFetch: true, robotsReviewedAt: now }, url, now, now)).rejects.toThrow("REFRESH_NOT_DUE");
  });
  it("rejects unsafe public links and private network ranges", () => {
    for (const unsafe of ["http://organizer.example/", "https://localhost/", "https://127.0.0.1/", "https://user:password@organizer.example/", "https://organizer.example/?access_token=test", "javascript:alert(1)"]) expect(publicHttpsUrl(unsafe)).toBeNull();
    for (const address of ["127.0.0.1", "10.1.1.1", "100.64.0.1", "169.254.169.254", "192.168.1.2", "::1"]) expect(isPublicIpv4(address)).toBe(false);
    expect(isPublicIpv4("8.8.8.8")).toBe(true);
  });
});
