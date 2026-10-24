import addressIndex from '../../../data/astana-address-index.json';
import places from '../../../data/places.json';
import { createAddressMatcher, enrichEventAddresses, type AddressIndex } from './address-match';
import { createEventVenueMatcher, type VenueGeoRecord } from './event-geo-media';
import type { LiveEventsResult } from './live-events';
import { sourcePermission, type SourcePolicyResolver } from '../retrieval/source-permission';
import { applicationSourcePolicy } from '../retrieval/application-source-policy';

/** One public-coordinate boundary shared by the map, retrieval and plans.
 * Raw publisher evidence is never overwritten. Revoked/expired derived OSM
 * evidence cannot survive a cached feed or a long-lived matcher. */
export function createPublicEventLocationEnricher(options: {
  index?: AddressIndex; places?: VenueGeoRecord[]; now?: () => number;
} = {}) {
  const index = options.index ?? addressIndex as AddressIndex;
  const clock = options.now ?? Date.now;
  const match = createAddressMatcher(index, clock);
  const venue = createEventVenueMatcher(options.places ?? places, match, clock);
  return (feed: LiveEventsResult, resolve: SourcePolicyResolver = applicationSourcePolicy): LiveEventsResult => {
    const now = clock(), asOf = Date.parse(index.source.asOf), fetched = Date.parse(index.source.retrievedAt);
    const osmAllowed = sourcePermission('osm-overpass-poi', 'display', resolve, now).allowed
      && Number.isFinite(asOf) && Number.isFinite(fetched) && asOf <= fetched
      && fetched <= now + 300_000 && now - asOf < 35 * 86400_000;
    const items = feed.items.filter(event => sourcePermission(event.provenance.sourceId, 'display', resolve, now).allowed).map(event => {
      const method = event.coordinateMatch?.method ?? event.coordinateProvenance?.methodId;
      const derived = method === 'osm-exact-address-v1' || method === 'osm-exact-venue-v1';
      const expired = event.expiresAt !== undefined && (!Number.isFinite(Date.parse(event.expiresAt)) || Date.parse(event.expiresAt) <= now);
      const current = { ...event, freshness: expired ? 'stale' as const : event.freshness ?? (feed.freshness === 'fresh' ? 'fresh' as const : 'stale' as const) };
      if (!derived) return current;
      // Recompute from current evidence and permission, never trust old coordinates.
      delete current.coordinateMatch; delete current.coordinateProvenance;
      return { ...current, lat: null, lon: null, coordinateQuality: 'unknown' as const,
        warnings: current.warnings.filter(value => !value.startsWith('Точка определена по точному адресу OpenStreetMap,')) };
    });
    return { ...feed, items: osmAllowed ? enrichEventAddresses(items, match, venue) : items };
  };
}

export const publicEventLocations = createPublicEventLocationEnricher();
