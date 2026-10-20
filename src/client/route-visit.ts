type Point = { lat: number; lon: number };
/** Proximity is only a prompt candidate, never a confirmed visit/conversion. */
export function nearbyRouteStop<T extends Point>(stops: T[], point: Point, accuracy: number): T | null {
  if (![point.lat, point.lon, accuracy].every(Number.isFinite) || accuracy < 0 || accuracy > 60) return null;
  const radians = Math.PI / 180;
  const distance = (stop: Point) => {
    const a = Math.sin((stop.lat - point.lat) * radians / 2) ** 2 + Math.cos(stop.lat * radians) * Math.cos(point.lat * radians) * Math.sin((stop.lon - point.lon) * radians / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const candidates = stops.map(stop => ({ stop, metres: distance(stop) })).filter(value => Number.isFinite(value.metres) && value.metres <= 100).sort((a, b) => a.metres - b.metres);
  // Adjacent venues cannot be distinguished by coarse GPS.
  if (candidates.length !== 1) return null;
  return candidates[0].stop;
}
