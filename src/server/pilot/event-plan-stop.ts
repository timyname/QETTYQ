import type { LiveAstanaEvent } from '../ingestion/sxodim-live';
import type { PlanStop } from './plans';

/** Publisher schedule + independently verified coordinates. Unknown duration stays null. */
export function eventPlanStop(event: LiveAstanaEvent, now = Date.now()): PlanStop | null {
  if (event.lat === null || event.lon === null || !Number.isFinite(event.lat) || !Number.isFinite(event.lon)
    || event.lat < 50.8 || event.lat > 51.5 || event.lon < 70.8 || event.lon > 72
    || !Number.isFinite(Date.parse(event.startsAt)) || !Number.isFinite(Date.parse(event.endsAt ?? event.startsAt))
    || event.endsAt !== null && Date.parse(event.endsAt) < Date.parse(event.startsAt)
    || Date.parse(event.endsAt ?? event.startsAt) <= now
    || event.expiresAt !== undefined && (!Number.isFinite(Date.parse(event.expiresAt)) || Date.parse(event.expiresAt) <= now)
    || event.freshness === 'stale' || event.status !== 'scheduled') return null;
  const supplied = event.durationMinutes;
  const fromDates = event.endsAt ? (Date.parse(event.endsAt) - Date.parse(event.startsAt)) / 60000 : null;
  const duration = supplied !== null && Number.isFinite(supplied) && supplied > 0 && supplied <= 1440 ? supplied
    : fromDates !== null && Number.isFinite(fromDates) && fromDates > 0 && fromDates <= 1440 ? fromDates : null;
  return {
    id: event.id, name: event.name, category: event.category ?? 'event', lat: event.lat, lon: event.lon,
    address: event.address, tags: ['event'], price: event.price.kind === 'exact' && event.price.basis === 'person' && event.priceFromKzt !== null
      ? { min: event.priceFromKzt, max: event.priceFromKzt } : null,
    durationMinutes: duration, durationState: duration === null ? 'unknown' : 'observed',
    eventStartsAt: event.startsAt, eventEndsAt: event.endsAt, openingHours: null, openingStatus: 'unknown',
    sourceUrl: event.provenance.sourceUrl, retrievedAt: event.fetchedAt, cuisines: [],
    coordinateQuality: event.coordinateQuality === 'derived' ? 'derived' : 'observed', media: { kind: 'none', src: null },
  };
}
