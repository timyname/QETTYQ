import type { HubRecord } from "./contracts";
import type { DataHubRepository } from "./repository";

type PlaceFacts = Extract<HubRecord, { kind: "place" }>["facts"];
type OccurrenceFacts = Extract<HubRecord, { kind: "occurrence" }>["facts"];
type Price = Pick<Extract<HubRecord, { kind: "offer" }>["facts"], "priceKind" | "minMinor" | "maxMinor" | "currency" | "basis">;
type AcceptedRow = ReturnType<DataHubRepository["listAccepted"]>[number];
export type HubPublicPlace = {
  id: string; sourceId: string; externalId: string; name: string; category: string | null; cityId: "astana" | "almaty";
  address: string | null; coordinates: PlaceFacts["coordinates"]; openingHours: string | null; tags: string[];
  sourceUrl: string; fetchedAt: string; expiresAt: string; requiredCredit: string | null;
  media: AcceptedRow["media"]; parserVersion: "qettyq-data-hub-v1";
};
export type HubPublicEvent = {
  id: string; sourceId: string; externalId: string; eventExternalId: string; name: string; category: string | null;
  cityId: "astana" | "almaty"; startsAt: string; endsAt: string | null; timeZone: "Asia/Almaty";
  languages: OccurrenceFacts["languages"]; availability: OccurrenceFacts["availability"];
  venue: HubPublicPlace | null; price: Price; priceState: "observed" | "unknown" | "conflicting";
  priceEvidence: { offerId: string; sourceUrl: string; fetchedAt: string; expiresAt: string } | null;
  bookingUrl: string | null; organizerUrl: string | null; sourceUrl: string; fetchedAt: string; expiresAt: string;
  requiredCredit: string | null; media: AcceptedRow["media"]; parserVersion: "qettyq-data-hub-v1";
};
export type HubPublicFeed = { cityId: "astana" | "almaty"; dataMode: "snapshot"; generationMode: "deterministic";
  generatedAt: string; places: HubPublicPlace[]; events: HubPublicEvent[]; warnings: string[] };

/** Source-approved facts only; deliberately NOT a Sxodim-typed occurrence cast.
 * No AI, network, inferred menu/schedule/coordinates/offer availability or photos. */
export function createPublicDataHubFeed(repository: DataHubRepository, clock: () => number = Date.now) {
  return { async get(options: { cityId: "astana" | "almaty"; forLlm?: boolean }): Promise<HubPublicFeed> {
    const now = clock(), common = { ...options, now, limit: 100 };
    const places = repository.readAcceptedRows({ ...common, kind: "place" }).flatMap(row => {
      if (row.kind !== "place") return [];
      return [{ id: row.id, sourceId: row.sourceId, externalId: row.externalId, name: row.facts.name, category: row.facts.category,
        cityId: row.facts.cityId, address: row.facts.address, coordinates: row.facts.coordinates, openingHours: row.facts.openingHours,
        tags: row.facts.tags, sourceUrl: row.sourceUrl, fetchedAt: row.fetchedAt, expiresAt: row.expiresAt,
        requiredCredit: typeof row.requiredCredit === "string" ? row.requiredCredit : null, media: row.media, parserVersion: "qettyq-data-hub-v1" as const }];
    });
    const offers = repository.readAcceptedRows({ ...common, kind: "offer" });
    const events = repository.readAcceptedRows({ ...common, kind: "occurrence" }).flatMap(row => {
      if (row.kind !== "occurrence" || !row.facts.startsAt) return [];
      const parent = repository.readAcceptedRows({ ...common, kind: "event", sourceId: row.sourceId, externalId: row.facts.eventExternalId, limit: 1 })[0];
      if (!parent || parent.kind !== "event") return [];
      const venueId = row.facts.venueExternalId ?? parent.facts.venueExternalId;
      const venue = places.find(place => place.sourceId === row.sourceId && place.externalId === venueId) ?? null;
      const applicable = offers.filter(offer => offer.sourceId === row.sourceId && offer.kind === "offer" &&
        (offer.facts.appliesTo.kind === "occurrence" && offer.facts.appliesTo.externalId === row.externalId
          || offer.facts.appliesTo.kind === "event" && offer.facts.appliesTo.externalId === row.facts.eventExternalId));
      const only = applicable.length === 1 && applicable[0].kind === "offer" ? applicable[0].facts : null;
      const offerRow = only ? applicable[0] : null;
      const price: Price = only ? { priceKind: only.priceKind, minMinor: only.minMinor, maxMinor: only.maxMinor, currency: only.currency, basis: only.basis }
        : { priceKind: "unknown", minMinor: null, maxMinor: null, currency: null, basis: "unknown" };
      return [{ id: row.id, sourceId: row.sourceId, externalId: row.externalId, eventExternalId: row.facts.eventExternalId,
        name: parent.facts.name, category: parent.facts.category, cityId: row.facts.cityId, startsAt: row.facts.startsAt,
        endsAt: row.facts.endsAt, timeZone: row.facts.timeZone, languages: row.facts.languages, availability: row.facts.availability,
        venue, price, priceState: applicable.length > 1 ? "conflicting" as const : price.priceKind === "unknown" ? "unknown" as const : "observed" as const,
        priceEvidence: offerRow ? { offerId: offerRow.id, sourceUrl: offerRow.sourceUrl, fetchedAt: offerRow.fetchedAt, expiresAt: offerRow.expiresAt } : null,
        bookingUrl: only?.bookingUrl ?? parent.facts.bookingUrl, organizerUrl: parent.facts.organizerUrl,
        sourceUrl: row.sourceUrl, fetchedAt: row.fetchedAt,
        expiresAt: new Date(Math.min(...[row.expiresAt, parent.expiresAt, ...(venue ? [venue.expiresAt] : []), ...(offerRow ? [offerRow.expiresAt] : [])].map(value => Date.parse(value)))).toISOString(),
        requiredCredit: typeof row.requiredCredit === "string" ? row.requiredCredit : null,
        media: row.media.length ? row.media : parent.media, parserVersion: "qettyq-data-hub-v1" as const }];
    });
    return { cityId: options.cityId, dataMode: "snapshot", generationMode: "deterministic", generatedAt: new Date(now).toISOString(), places, events,
      warnings: ["Только принятые данные разрешённых источников. Это не полная афиша города и не гарантия наличия мест.",
        "Часы опубликованы источником; исключения, цену и доступность уточняйте перед посещением. Маршрут и бюджет здесь не проверялись."] };
  } };
}
