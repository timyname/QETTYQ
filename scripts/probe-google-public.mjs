// ONE owner-authorized real Google attempt, under existing durable $10 ledger.
// No key reading, no AI request, no Places content saved to disk.
const base = 'https://qettyqapp.anamai.kz';
const start = await fetch(`${base}/api/session`, { method: 'POST' });
const session = start.headers.get('x-qettyq-session');
if (!start.ok || !session) throw Error('SESSION_UNAVAILABLE');
const headers = { 'x-qettyq-session': session, 'content-type': 'application/json' };
try {
  const response = await fetch(`${base}/api/places/search`, { method: 'POST', headers,
    body: JSON.stringify({ query: 'рамен', language: 'ru', consent: true }) });
  const body = await response.json();
  console.log(JSON.stringify({ http: response.status, status: body.status, reason: body.reason,
    items: body.items?.length, withHours: body.items?.filter(item => item.openingHoursText?.length).length,
    withPhotos: body.items?.filter(item => item.photo?.uri && item.photo?.sourceUrl).length,
    photoAuthorCredits: body.items?.reduce((sum, item) => sum + (item.photo?.authors?.length ?? 0), 0),
    storage: body.storage, mapDisplay: body.mapDisplay }));
  if (body.status !== 'live') process.exitCode = 2;
  else if (!body.items?.some(item => item.photo?.uri && item.photo?.sourceUrl)) process.exitCode = 3;
} finally {
  const cleanup = await fetch(`${base}/api/session/data`, { method: 'DELETE', headers });
  if (!cleanup.ok) throw Error('OWN_SESSION_CLEANUP_FAILED');
}
