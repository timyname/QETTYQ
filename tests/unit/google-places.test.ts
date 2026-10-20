import { describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createGooglePlacesRuntime, GOOGLE_PLACES_FIELDS } from "../../src/server/pilot/google-places";
import { createGoogleReservation, GOOGLE_RESERVATIONS_SCHEMA } from "../../src/server/vps/google-runtime";
const request = { query: "рамен", language: "ru" as const, consent: true, requestId: "synthetic-request" };
describe("Google Places boundary (synthetic responses, no real key/API)", () => {
  it("requires explicit consent, server key and durable budget before fetch", async () => {
    const fetcher = vi.fn<typeof fetch>(), reserve = vi.fn().mockReturnValue(true);
    const runtime = createGooglePlacesRuntime({ key: "unit-test-only", enabled: true, approved: true, fetcher, reserve });
    expect((await runtime.search({ ...request, consent: false })).status).toBe("consent_required");
    expect(fetcher).not.toHaveBeenCalled(); expect(reserve).not.toHaveBeenCalled();
    expect((await createGooglePlacesRuntime({ enabled: true, approved: true, fetcher, reserve }).search(request)).reason).toBe("GOOGLE_SERVER_KEY_REQUIRED");
    expect((await createGooglePlacesRuntime({ key: "unit-test-only", enabled: true, approved: true, fetcher }).search(request)).reason).toBe("GOOGLE_BUDGET_STORAGE_UNAVAILABLE");
  });
  it("returns live mapless attributed cards, never OSM coordinates or menu guarantees", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ places: [{ id: "synthetic-google-id", displayName: { text: "SYNTHETIC TEST ramen" }, formattedAddress: "SYNTHETIC TEST address", googleMapsUri: "https://maps.google.com/?cid=123", location: { latitude: 51.13, longitude: 71.43 }, currentOpeningHours: { weekdayDescriptions: ["SYNTHETIC TEST Monday"] }, attributions: [{ provider: "SYNTHETIC TEST credit", providerUri: "https://example.org" }] }] })));
    const result = await createGooglePlacesRuntime({ key: "unit-test-only", enabled: true, approved: true, fetcher, reserve: () => true }).search(request);
    expect(result).toMatchObject({ status: "live", storage: "no_store", mapDisplay: "external_google_only", attribution: { text: "Google Maps" } });
    expect(result.items[0]).toMatchObject({ cuisineOrDishConfirmed: false, thirdPartyAttributions: [{ name: "SYNTHETIC TEST credit", url: "https://example.org/" }] });
    expect(result.items[0]).not.toHaveProperty("lat"); expect(result.items[0]).not.toHaveProperty("location");
    const init = fetcher.mock.calls[0][1]!; expect(new Headers(init.headers).get("X-Goog-FieldMask")).toBe(GOOGLE_PLACES_FIELDS);
    expect(GOOGLE_PLACES_FIELDS).not.toMatch(/\*|reviews|rating/); expect(GOOGLE_PLACES_FIELDS).toContain("places.photos"); expect(init.cache).toBe("no-store");
  });
  it.each(["51.12345,71.45678", "51,123456 71,654321", "+51.12 +71,45"])("retains reservation on failure, redacts %s and never retries", async coordinates => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("private provider details", { status: 403 })), reserve = vi.fn().mockReturnValue(true);
    const result = await createGooglePlacesRuntime({ key: "unit-test-only", enabled: true, approved: true, fetcher, reserve }).search({ ...request, query: `рамен ${coordinates}` });
    expect(result.reason).toBe("GOOGLE_ACCESS_NOT_ENABLED"); expect(JSON.stringify(result)).not.toContain("private");
    expect(fetcher).toHaveBeenCalledTimes(1); expect(reserve).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).textQuery).not.toMatch(/51[.,]\d|71[.,]\d/);
  });
  it("durably caps at the approved $10, rejects duplicate IDs and cooldown without resets", () => {
    const db = new DatabaseSync(":memory:"); db.exec(GOOGLE_RESERVATIONS_SCHEMA);
    let now = 100_000; const reserve = createGoogleReservation(db, () => now);
    expect(reserve("first")).toBe(true); expect(reserve("second")).toBe(false);
    now += 2000; expect(reserve("first")).toBe(false);
    for (let i = 1; i < 100; i++) { now += 2000; expect(reserve(`request-${i}`)).toBe(true); }
    now += 2000; expect(createGoogleReservation(db, () => now)("over-cap")).toBe(false);
    expect(db.prepare("SELECT SUM(reserve_micro_usd) AS reserved FROM qettyq_google_reservations").get()?.reserved).toBe(10_000_000);
    db.close();
  });
});
