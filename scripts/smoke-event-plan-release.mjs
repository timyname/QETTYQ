// Manual own-session public smoke: no AI/Google/2GIS provider calls or fabricated events.
const base = 'https://qettyqapp.anamai.kz';
const check = (value, reason) => { if (!value) throw Error(reason); };
const opened = await fetch(`${base}/api/session`, { method: 'POST' });
const token = opened.headers.get('x-qettyq-session');
check(opened.ok && token, 'SESSION_FAILED');
const headers = { 'x-qettyq-session': token, 'content-type': 'application/json' };
try {
  const config = await fetch(`${base}/api/maps/config`).then(r => r.json());
  check(config.enabled === true && config.provider === '2gis' && typeof config.browserKey === 'string' && typeof config.styleId === 'string', 'APPROVED_MAPGL_NOT_ACTIVE');
  const catalog = await fetch(`${base}/api/catalog`).then(r => r.json());
  const feed = await fetch(`${base}/api/events`).then(r => r.json());
  check(feed.items.every(event => ['none', 'organizer_poster'].includes(event.media?.kind)), 'GENERATED_EVENT_ART');
  const event = feed.items.find(event => event.lat !== null && event.lon !== null && event.status === 'scheduled' && Date.parse(event.startsAt) > Date.now());
  check(event, 'NO_ROUTABLE_REAL_EVENT');
  const places = catalog.items.slice(0, 2);
  const ids = [...places.map(place => place.id), event.id];
  const submit = async order => {
    const r = await fetch(`${base}/api/plans`, { method: 'POST', headers, body: JSON.stringify({ placeIds: order, context: { cityId: 'astana', goal: 'activity', minutes: 720, budget: null, origin: { lat: places[0].lat, lon: places[0].lon } } }) });
    check(r.ok, 'MIXED_PLAN_HTTP_FAILED'); const result = await r.json();
    check(JSON.stringify(result.plan.stops.map(stop => stop.id)) === JSON.stringify(order), 'STOP_ORDER_FAILED');
    if (event.durationMinutes === null && event.endsAt === null) {
      check(result.plan.stops.find(stop => stop.id === event.id).durationMinutes === null && result.plan.visitMinutes === null && result.plan.totalMinutes === null, 'UNKNOWN_DURATION_BECAME_ZERO');
    }
    return result.plan;
  };
  await submit(ids); await submit([event.id, ids[1], ids[0]]); await submit([ids[1], event.id]);
  console.log(JSON.stringify({ places: catalog.items.length, events: feed.items.length, geocodedEvents: feed.items.filter(event => event.lat !== null && event.lon !== null).length,
    generatedEventImages: 0, browserMap: 'approved temporary 2GIS demo + published style', realEventMixedPlan: 'PASS', reorderThreeStops: 'PASS', removeToTwoStops: 'PASS', unknownDuration: event.durationMinutes === null ? 'PASS' : 'observed' }));
} finally {
  check((await fetch(`${base}/api/session/data`, { method: 'DELETE', headers })).ok, 'OWN_SESSION_CLEANUP_FAILED');
  console.log('own disposable plans + session deleted');
}
