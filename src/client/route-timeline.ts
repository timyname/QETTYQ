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

export function arrivalLabels(departure: string, originKnown: boolean, visits: number[], legs: Array<{ estimatedMinutes: number }> = []) {
  let elapsed = 0;
  const epoch = Date.parse(departure);
  let known = originKnown && Number.isFinite(epoch);
  return visits.map((visit, index) => {
    const leg = legs[index];
    if (!known || !leg || !Number.isFinite(leg.estimatedMinutes) || leg.estimatedMinutes < 0 || !Number.isFinite(visit) || visit < 0) { known = false; return null; }
    elapsed += leg.estimatedMinutes;
    const arrival = new Date(epoch + elapsed * 60000).toISOString();
    elapsed += visit;
    return arrival;
  });
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
