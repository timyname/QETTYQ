const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function astanaDateInput(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(+date)) return '';
  const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Resolve a wall-clock input using the runtime's Astana timezone, not the device timezone. */
export function parseAstanaDateInput(value: string) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return null;
  const provisional = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(provisional)) return null;
  const projected = Date.parse(`${astanaDateInput(new Date(provisional).toISOString())}:00Z`);
  const instant = new Date(provisional - (projected - provisional));
  return astanaDateInput(instant.toISOString()) === value ? instant.toISOString() : null;
}

type TimelineStop = { durationMinutes: number | null; eventStartsAt?: string | null };
export type RouteTimelineStop = { arrival: string | null; visitStart: string | null; departure: string | null; waitMinutes: number | null; lateMinutes: number | null };

/** Deterministic timing only: provider/estimated legs, supplied durations and
 * source event start. Missing duration never erases the known current arrival,
 * but prevents every subsequent arrival and total from being invented. */
export function buildRouteTimeline(departure: string, originKnown: boolean, stops: TimelineStop[], legs: Array<{ estimatedMinutes: number }> = []) {
  let elapsed = 0;
  let waiting = 0;
  const epoch = Date.parse(departure);
  let known = originKnown && Number.isFinite(epoch);
  const empty = (): RouteTimelineStop => ({ arrival: null, visitStart: null, departure: null, waitMinutes: null, lateMinutes: null });
  const result = stops.map((stop, index): RouteTimelineStop => {
    const visit = stop.durationMinutes;
    const leg = legs[index];
    if (!known || !leg || !Number.isFinite(leg.estimatedMinutes) || leg.estimatedMinutes < 0 || visit !== null && (!Number.isFinite(visit) || visit < 0)) { known = false; return empty(); }
    elapsed += leg.estimatedMinutes;
    const arrivalEpoch = epoch + elapsed * 60000;
    if (!Number.isFinite(new Date(arrivalEpoch).getTime())) { known = false; return empty(); }
    const arrival = new Date(arrivalEpoch).toISOString();
    const scheduled = stop.eventStartsAt ? Date.parse(stop.eventStartsAt) : null;
    if (scheduled !== null && !Number.isFinite(scheduled)) { known = false; return { ...empty(), arrival }; }
    const waitMinutes = scheduled === null ? 0 : Math.max(0, (scheduled - arrivalEpoch) / 60000);
    const lateMinutes = scheduled === null ? 0 : Math.max(0, (arrivalEpoch - scheduled) / 60000);
    waiting += waitMinutes;
    elapsed += waitMinutes;
    const visitStart = new Date(epoch + elapsed * 60000).toISOString();
    if (visit === null) { known = false; return { arrival, visitStart, departure: null, waitMinutes, lateMinutes }; }
    elapsed += visit;
    if (!Number.isFinite(new Date(epoch + elapsed * 60000).getTime())) { known = false; return { arrival, visitStart, departure: null, waitMinutes, lateMinutes }; }
    return { arrival, visitStart, departure: new Date(epoch + elapsed * 60000).toISOString(), waitMinutes, lateMinutes };
  });
  // An explicit final destination/return leg is part of total time, not a stop.
  if (known) for (const leg of legs.slice(stops.length)) {
    if (!leg || !Number.isFinite(leg.estimatedMinutes) || leg.estimatedMinutes < 0) { known = false; break; }
    elapsed += leg.estimatedMinutes;
    if (!Number.isFinite(new Date(epoch + elapsed * 60000).getTime())) { known = false; break; }
  }
  return { stops: result, waitMinutes: known ? waiting : null, totalMinutes: known ? elapsed : null, lateStopIndices: result.flatMap((stop, index) => stop.lateMinutes !== null && stop.lateMinutes > 0 ? [index] : []) };
}

export function arrivalLabels(departure: string, originKnown: boolean, visits: (number | null)[], legs: Array<{ estimatedMinutes: number }> = []) {
  return buildRouteTimeline(departure, originKnown, visits.map(durationMinutes => ({ durationMinutes })), legs).stops.map(stop => stop.arrival);
}

type Point = { lat: number; lon: number };
export function googleWalkingPlanUrl(stops: Point[], origin?: Point | null, destination?: Point | null) {
  if (!stops.length) return null;
  const all = destination ? [...stops, destination] : stops;
  const end = all.at(-1)!;
  const params = new URLSearchParams({ api: '1', destination: `${end.lat},${end.lon}`, travelmode: 'walking' });
  if (origin) params.set('origin', `${origin.lat},${origin.lon}`);
  if (all.length > 1) params.set('waypoints', all.slice(0, -1).map(p => `${p.lat},${p.lon}`).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}
