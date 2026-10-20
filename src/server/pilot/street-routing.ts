/** Server-only routing adapter. No user coordinates, paths or provider bodies are logged or stored. */
export type RoutingPoint = { lat: number; lon: number };
export type RoutingProvider = 'fossgis_foot' | 'valhalla_demo' | 'openrouteservice';
export type RouteGeometry = { type: 'LineString'; coordinates: [number, number][] };
export type StreetRoute = {
  quality: 'street'; profile: 'foot'; provider: RoutingProvider; fetchedAt: string;
  geometry: RouteGeometry; distanceMeters: number; durationSeconds: number;
  legs: Array<{ distanceMeters: number; durationSeconds: number }>;
  attribution: { text: string; url: string }; warnings: string[];
};
export type RoutingStatus = { available: boolean; provider: RoutingProvider; label: string; reason: string | null; localDemo: boolean };
export const ROUTING_PROVIDERS = {
  fossgis_foot: { label: 'FOSSGIS / OSRM Foot', url: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/', credit: 'FOSSGIS / OSRM Foot · © OpenStreetMap contributors', creditUrl: 'https://routing.openstreetmap.de/about.html' },
  valhalla_demo: { label: 'Valhalla / FOSSGIS', url: 'https://valhalla1.openstreetmap.de/route', credit: 'Valhalla / FOSSGIS · © OpenStreetMap contributors', creditUrl: 'https://valhalla.openstreetmap.de/' },
  openrouteservice: { label: 'openrouteservice / HeiGIT', url: 'https://api.heigit.org/openrouteservice/v2/directions/foot-walking/geojson', credit: '© openrouteservice.org by HeiGIT · Map data © OpenStreetMap contributors', creditUrl: 'https://openrouteservice.org/' },
} as const;
export function routingStatus(request: Request, env: Record<string, string | undefined> = process.env): RoutingStatus {
  const provider: RoutingProvider = env.QETTYQ_ROUTING_PROVIDER === 'openrouteservice' ? 'openrouteservice' : env.QETTYQ_ROUTING_PROVIDER === 'valhalla_demo' ? 'valhalla_demo' : 'fossgis_foot';
  const host = new URL(request.url).hostname;
  const localDemo = env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(host);
  let reason: string | null = null;
  if (!localDemo && env.QETTYQ_PUBLIC_ROUTING_ENABLED !== 'true') reason = 'PUBLIC_ROUTING_DISABLED';
  else if (!localDemo && env.QETTYQ_ROUTING_GLOBAL_LIMITER_READY !== 'true') reason = 'GLOBAL_ROUTING_LIMITER_REQUIRED';
  else if (provider === 'valhalla_demo' && !localDemo && env.QETTYQ_VALHALLA_PUBLIC_USAGE_ACK !== 'true') reason = 'PUBLIC_DEMO_POLICY_REVIEW_REQUIRED';
  else if (provider === 'openrouteservice' && !env.OPENROUTESERVICE_API_KEY?.trim()) reason = 'ROUTING_KEY_MISSING';
  return { available: reason === null, provider, label: ROUTING_PROVIDERS[provider].label, reason, localDemo };
}
export function validRoutingPoints(input: unknown): input is RoutingPoint[] {
  return Array.isArray(input) && input.length >= 2 && input.length <= 8 && input.every(p => p && typeof p === 'object' && typeof p.lat === 'number' && typeof p.lon === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.lat >= 50.9 && p.lat <= 51.35 && p.lon >= 71.15 && p.lon <= 71.75);
}
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const metric = (value: unknown, limit: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= limit ? value : null;
function geometry(value: unknown): RouteGeometry | null {
  const g = object(value);
  if (g.type !== 'LineString' || !Array.isArray(g.coordinates) || g.coordinates.length < 2 || g.coordinates.length > 20_000) return null;
  const coordinates: [number, number][] = [];
  for (const c of g.coordinates) {
    if (!Array.isArray(c) || c.length < 2 || typeof c[0] !== 'number' || typeof c[1] !== 'number' || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || c[0] < 70.9 || c[0] > 72 || c[1] < 50.7 || c[1] > 51.55) return null;
    coordinates.push([c[0], c[1]]);
  }
  return { type: 'LineString', coordinates };
}
export function parseStreetRoute(payload: unknown, provider: RoutingProvider, count: number, now = Date.now()): StreetRoute | null {
  const body = object(payload);
  const ors = provider === 'openrouteservice';
  const route = !ors ? object(Array.isArray(body.routes) ? body.routes[0] : null) : object(Array.isArray(body.features) ? body.features[0] : null);
  if (!ors && body.code !== 'Ok') return null;
  const properties = !ors ? route : object(route.properties);
  const summary = !ors ? properties : object(properties.summary);
  const line = geometry(route.geometry);
  const distanceMeters = metric(summary.distance, 200_000), durationSeconds = metric(summary.duration, 172_800);
  const rawLegs = !ors ? properties.legs : properties.segments;
  if (!line || distanceMeters === null || durationSeconds === null || !Array.isArray(rawLegs) || rawLegs.length !== count - 1) return null;
  const legs: StreetRoute['legs'] = [];
  for (const raw of rawLegs) {
    const leg = object(raw), distance = metric(leg.distance, 200_000), duration = metric(leg.duration, 172_800);
    if (distance === null || duration === null) return null;
    legs.push({ distanceMeters: distance, durationSeconds: duration });
  }
  // A partial provider response must not turn missing legs into zero-minute travel.
  if (Math.abs(legs.reduce((a, b) => a + b.distanceMeters, 0) - distanceMeters) > Math.max(10, distanceMeters * .03) || Math.abs(legs.reduce((a, b) => a + b.durationSeconds, 0) - durationSeconds) > Math.max(5, durationSeconds * .03)) return null;
  const config = ROUTING_PROVIDERS[provider];
  return { quality: 'street', profile: 'foot', provider, fetchedAt: new Date(now).toISOString(), geometry: line, distanceMeters, durationSeconds, legs, attribution: { text: config.credit, url: config.creditUrl }, warnings: ['Время пешком рассчитано маршрутизатором, но остаётся оценкой. Проверь проходы, погоду и ограничения на месте.', 'Посещения и доступность мероприятий не подтверждаются дорожным маршрутом.'] };
}
type Result = { ok: true; route: StreetRoute } | { ok: false; reason: string; retryAfterSeconds?: number; providerHttpStatus?: number };
export function createStreetRouter(deps: { fetcher?: typeof fetch; now?: () => number; timeoutMs?: number } = {}) {
  let lastAttempt = -Infinity, inFlight = false;
  return async (points: RoutingPoint[], provider: RoutingProvider, key?: string): Promise<Result> => {
    if (!validRoutingPoints(points)) return { ok: false, reason: 'INVALID_POINTS' };
    if (provider === 'openrouteservice' && !key?.trim()) return { ok: false, reason: 'ROUTING_KEY_MISSING' };
    const now = deps.now?.() ?? Date.now();
    if (inFlight || now - lastAttempt < 5_000) return { ok: false, reason: 'ROUTING_RATE_LIMITED', retryAfterSeconds: 5 };
    lastAttempt = now; inFlight = true;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 10_000);
    let providerHttpStatus: number | undefined;
    const failure = (reason: string): Result => ({ ok: false, reason, ...(providerHttpStatus !== undefined ? { providerHttpStatus } : {}) });
    try {
      const config = ROUTING_PROVIDERS[provider];
      // Honest application identity and canonical public page, as required by FOSSGIS policy.
      // Do not impersonate a browser, rotate identities or follow a block to another host.
      const headers: Record<string, string> = { accept: 'application/json', 'user-agent': 'QETTYQ-Astana-pilot/1.0 (+https://qettyqapp.anamai.kz/; https://github.com/timyname/QETTYQ)', referer: 'https://qettyqapp.anamai.kz/' };
      if (provider !== 'fossgis_foot') headers['content-type'] = 'application/json';
      if (provider === 'valhalla_demo') headers['x-client-id'] = 'qettyq-astana-pilot';
      if (provider === 'openrouteservice') headers.authorization = key!;
      const body = provider === 'valhalla_demo' ? { locations: points.map(p => ({ ...p, type: 'break' })), costing: 'pedestrian', format: 'osrm', shape_format: 'geojson', units: 'kilometers', directions_type: 'none', alternates: 0 } : { coordinates: points.map(p => [p.lon, p.lat]), instructions: false, units: 'm' };
      const url = provider === 'fossgis_foot' ? `${config.url}${points.map(p => `${p.lon},${p.lat}`).join(';')}?overview=full&geometries=geojson&steps=false&generate_hints=false` : config.url;
      // Workers rejects redirect:'error' during Request construction. Manual returns
      // 3xx without following it; the !ok branch below rejects every such response.
      const response = await (deps.fetcher ?? fetch)(url, { method: provider === 'fossgis_foot' ? 'GET' : 'POST', headers, ...(provider === 'fossgis_foot' ? {} : { body: JSON.stringify(body) }), redirect: 'manual', signal: controller.signal, cache: 'no-store' });
      if (Number.isInteger(response.status) && response.status >= 100 && response.status <= 599) providerHttpStatus = response.status;
      if (!response.ok) return failure(response.status === 429 ? 'ROUTING_RATE_LIMITED' : 'ROUTING_PROVIDER_UNAVAILABLE');
      if (Number(response.headers.get('content-length')) > 2_000_000) return failure('ROUTING_INVALID_RESPONSE');
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > 2_000_000) return failure('ROUTING_INVALID_RESPONSE');
      const route = parseStreetRoute(JSON.parse(text), provider, points.length, now);
      return route ? { ok: true, route } : failure('ROUTING_INVALID_RESPONSE');
    } catch { return failure(controller.signal.aborted ? 'ROUTING_TIMEOUT' : 'ROUTING_PROVIDER_UNAVAILABLE'); }
    finally { clearTimeout(timer); inFlight = false; }
  };
}
export const requestStreetRoute = createStreetRouter();
