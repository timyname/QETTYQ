import { describe, expect, it, vi } from "vitest";
import { createGooglePlacesRuntime } from "../../src/server/pilot/google-places";
import { googlePhotoUri, loadGooglePlacePhoto } from "../../src/server/pilot/google-place-photos";

const photo = { name: "places/test_place/photos/test_resource", googleMapsUri: "https://www.google.com/maps/contrib/test/photo/test", authorAttributions: [{ displayName: "SYNTHETIC TEST author", uri: "https://www.google.com/maps/contrib/test" }] };
const input = { query: "SYNTHETIC TEST coffee", language: "en" as const, consent: true, requestId: "synthetic-photo-bundle" };
const place = { id: "test_place", displayName: { text: "SYNTHETIC TEST venue" }, googleMapsUri: "https://maps.google.com/?cid=1", location: { latitude: 51.13, longitude: 71.43 }, photos: [photo] };

describe("Google photo policy, synthetic responses only", () => {
  it("uses a fixed endpoint, header-only key, no redirects/cache and keeps authors/source", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ photoUri: "https://lh3.googleusercontent.com/synthetic-photo" }));
    const result = await loadGooglePlacePhoto("test_place", [photo], { key: "synthetic-secret", fetcher });
    expect(result).toEqual({ uri: "https://lh3.googleusercontent.com/synthetic-photo", sourceUrl: photo.googleMapsUri, authors: [{ name: "SYNTHETIC TEST author", url: photo.authorAttributions[0].uri }] });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe("https://places.googleapis.com/v1/places/test_place/photos/test_resource/media?maxWidthPx=800&skipHttpRedirect=true");
    expect(String(url)).not.toContain("synthetic-secret");
    expect(init).toMatchObject({ cache: "no-store", redirect: "error" });
    expect(new Headers(init?.headers).get("X-Goog-Api-Key")).toBe("synthetic-secret");
    expect(JSON.stringify(result)).not.toMatch(/synthetic-secret|test_resource/);
  });
  it.each(["http://lh3.googleusercontent.com/x", "https://evil.test/x", "https://lh3.googleusercontent.com.evil.test/x", "https://user@lh3.googleusercontent.com/x", "https://lh3.googleusercontent.com:8443/x", "https://lh3.googleusercontent.com/x?key=secret"])("rejects unapproved media URL %s", value => expect(googlePhotoUri(value)).toBeNull());
  it.each([{ ...photo, name: "places/other/photos/test_resource" }, { ...photo, name: "places/test_place/photos/../../secret" }, { ...photo, googleMapsUri: "https://evil.test" }, { ...photo, authorAttributions: undefined }, { ...photo, authorAttributions: [{ displayName: 1 }] }])("rejects mismatched/unattributed photo without making a call", async invalid => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await loadGooglePlacePhoto("test_place", [invalid], { key: "synthetic-secret", fetcher })).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("bounds a bundle to five photos under ONE unchanged $0.10 reservation", async () => {
    const reserve = vi.fn().mockReturnValue(true);
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async url => String(url).endsWith("places:searchText") ? Response.json({ places: Array.from({ length: 20 }, () => place) }) : Response.json({ photoUri: "https://lh3.googleusercontent.com/synthetic-photo" }));
    const result = await createGooglePlacesRuntime({ key: "synthetic-secret", enabled: true, approved: true, reserve, fetcher }).search(input);
    expect(result.items).toHaveLength(5); expect(result.items.every(item => item.photo)).toBe(true);
    expect(reserve).toHaveBeenCalledTimes(1); expect(fetcher).toHaveBeenCalledTimes(6);
    expect(JSON.stringify(result)).not.toMatch(/synthetic-secret|test_resource|latitude|longitude/);
  });
  it("keeps text results if photos fail, without retries or credential errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ places: [place] })).mockResolvedValue(new Response("secret-error", { status: 403 }));
    const result = await createGooglePlacesRuntime({ key: "synthetic-secret", enabled: true, approved: true, reserve: () => true, fetcher }).search(input);
    expect(result).toMatchObject({ status: "live", items: [{ photo: null }] });
    expect(fetcher).toHaveBeenCalledTimes(2); expect(JSON.stringify(result)).not.toContain("secret-error");
  });
  it("does not load photos or search after budget exhaustion or without consent", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const runtime = createGooglePlacesRuntime({ key: "synthetic-secret", enabled: true, approved: true, reserve: () => false, fetcher });
    expect((await runtime.search(input)).reason).toBe("GOOGLE_BUDGET_OR_RATE_LIMIT");
    expect((await runtime.search({ ...input, consent: false })).status).toBe("consent_required");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
