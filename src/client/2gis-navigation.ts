type Point = { lat: number; lon: number };
const valid = (p: Point) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

/** Official HTTPS app/web link, no API key. Intermediate points are explicitly
 * documented for Android; the receiving iOS app may not retain all waypoints.
 * https://help.2gis.ru/question/razrabotchikam-zapusk-ideystviya-vmobilnom-prilozhenii-cherez-deeplink
 */
export function twoGisWalkingPlanUrl(stops: Point[], origin?: Point | null, destination?: Point | null): string | null {
  if (!stops.length || stops.length > 10 || !stops.every(valid) || origin && !valid(origin) || destination && !valid(destination)) return null;
  const points = [...(origin ? [origin] : []), ...stops, ...(destination ? [destination] : [])];
  if (points.length > 12) return null;
  const coordinates = points.map(p => `${p.lon},${p.lat}`).join('|');
  return `https://2gis.ru/directions/tab/pedestrian/points/${origin ? '' : '|'}${coordinates}`;
}
