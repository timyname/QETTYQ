/** Google media stays in this consented request only, never in our OSM registry. */
export type GooglePlacePhoto = {
  uri: string;
  sourceUrl: string;
  authors: Array<{ name: string; url: string | null }>;
};

export function googleMapsLink(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const link = new URL(raw);
    return link.protocol === "https:" && !link.username && !link.password && !link.port
      && (link.hostname === "maps.google.com" || ["google.com", "www.google.com"].includes(link.hostname) && link.pathname.startsWith("/maps")) ? link.href : null;
  } catch { return null; }
}

export function googlePhotoUri(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 8192) return null;
  try {
    const link = new URL(raw);
    // The documented skipHttpRedirect response uses this image CDN. Fail closed
    // on new hosts rather than allowing provider-controlled arbitrary URLs.
    return link.protocol === "https:" && /^lh[3-6]\.googleusercontent\.com$/.test(link.hostname)
      && !link.username && !link.password && !link.port && !link.searchParams.has("key") ? link.href : null;
  } catch { return null; }
}

export async function loadGooglePlacePhoto(placeId: string, photos: unknown, options: { key: string; fetcher: typeof fetch }): Promise<GooglePlacePhoto | null> {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(placeId) || !Array.isArray(photos)) return null;
  const photo = photos.find(value => {
    if (!value || typeof value !== "object") return false;
    const entry = value as Record<string, unknown>;
    return typeof entry.name === "string" && entry.name.startsWith(`places/${placeId}/photos/`)
      && /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]{1,2000}$/.test(entry.name)
      && googleMapsLink(entry.googleMapsUri) && Array.isArray(entry.authorAttributions)
      && entry.authorAttributions.every((author: unknown) => !!author && typeof author === "object" && typeof (author as Record<string, unknown>).displayName === "string");
  }) as Record<string, unknown> | undefined;
  if (!photo) return null;
  try {
    // Exactly one attempt per result, at most five per $0.10 search reservation.
    const response = await options.fetcher(`https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&skipHttpRedirect=true`, {
      headers: { "X-Goog-Api-Key": options.key }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const raw = await response.text();
    if (new TextEncoder().encode(raw).byteLength > 16_384) return null;
    const uri = googlePhotoUri((JSON.parse(raw) as { photoUri?: unknown }).photoUri);
    if (!uri || uri.includes(options.key) || uri.includes(encodeURIComponent(options.key))) return null;
    return { uri, sourceUrl: googleMapsLink(photo.googleMapsUri)!, authors: (photo.authorAttributions as Record<string, unknown>[]).map(author => ({
      name: (author.displayName as string).slice(0, 200), url: googleMapsLink(author.uri),
    })) };
  } catch { return null; }
}
