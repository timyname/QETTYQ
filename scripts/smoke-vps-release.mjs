// Manual public release smoke. Uses only its own disposable identity; never reads keys.
// --ai makes ONE explicitly requested paid assistant attempt under the existing ledger.
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3188');
if (!['127.0.0.1', 'qettyqapp.anamai.kz'].includes(base.hostname)) throw Error('SMOKE_TARGET_NOT_ALLOWED');
let session = '', memoryCookie = '';
async function createSession() {
  const response = await fetch(new URL('/api/session', base), { method: 'POST' });
  if (![200, 201].includes(response.status)) throw Error('SESSION_FAILED');
  session = response.headers.get('x-qettyq-session') ?? '';
  if (!session) throw Error('SESSION_HEADER_MISSING');
}
async function call(path, method = 'GET', body) {
  const response = await fetch(new URL(path, base), { method, headers: {
    'x-qettyq-session': session, 'content-type': 'application/json',
    ...(memoryCookie ? { cookie: memoryCookie } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const cookie = response.headers.getSetCookie().find(value => value.startsWith('__Host-qettyq_memory='));
  if (cookie) memoryCookie = cookie.split(';')[0];
  return { status: response.status, data: await response.json(), cookie };
}
function check(ok, reason) { if (!ok) throw Error(reason); }
await createSession();
try {
  let result = await call('/api/memory');
  check(result.status === 200 && result.data.enabled === false && !memoryCookie, 'UNEXPECTED_INITIAL_MEMORY');
  result = await call('/api/memory/consents', 'POST', { scope: 'profile', retention: 'session_24h' });
  check(result.status === 200 && memoryCookie && /HttpOnly/iu.test(result.cookie) && /Secure/iu.test(result.cookie), 'CONSENT_OR_COOKIE_FAILED');
  result = await call('/api/memory/profile', 'PATCH', { likedTags: ['culture'], locale: 'kk' });
  check(result.status === 200, 'PROFILE_WRITE_FAILED');
  if (process.argv.includes('--pause-for-restart')) {
    console.log('OWN_PROFILE_READY_FOR_RESTART');
    await new Promise(resolve => process.stdin.once('data', resolve));
  }
  // A new short-lived guest session still restores this opaque memory identity.
  await call('/api/session/data', 'DELETE');
  await createSession();
  result = await call('/api/memory');
  check(result.status === 200 && result.data.profile?.locale === 'kk', 'MEMORY_RESTORE_FAILED');
  console.log('memory: opt-in / Secure HttpOnly cookie / profile / new-session restore PASS');
  const google = await call('/api/places/search', 'POST', { query: 'рамен', language: 'en', consent: true });
  console.log('google:', google.status, google.data.status, google.data.reason);
  check(google.status === 503 && google.data.reason === 'GOOGLE_SERVER_KEY_REQUIRED', 'GOOGLE_EXPECTED_DISABLED');
  if (process.argv.includes('--ai')) {
    const status = await call('/api/assistant/status');
    check(status.data.available === true, `AI_UNAVAILABLE_${status.data.reason}`);
    const ai = await call('/api/chat', 'POST', { text: 'Помоги выбрать лекцию в Астане.', language: 'ru', useAI: true, googleConsent: false, context: { goal: 'activity', budget: null, minutes: 120 } });
    console.log('assistant:', JSON.stringify({ status: ai.status, mode: ai.data.mode, reasoningMode: ai.data.reasoningMode, model: ai.data.model, reason: ai.data.reason, events: ai.data.events?.length, citations: ai.data.citations?.length }));
    check(ai.status === 200 && ai.data.mode === 'openai' && ai.data.reasoningMode === 'plan_retrieve_answer', 'REASONER_NOT_CONFIRMED');
  }
} finally {
  const removed = await call('/api/memory', 'DELETE');
  check(removed.status === 200 && removed.data.deleted === true, 'OWN_MEMORY_CLEANUP_FAILED');
  const empty = await call('/api/memory');
  check(empty.status === 200 && empty.data.enabled === false, 'OWN_MEMORY_NOT_EMPTY');
  const ended = await call('/api/session/data', 'DELETE');
  check(ended.status === 200, 'OWN_SESSION_CLEANUP_FAILED');
  console.log('own memory + guest session deleted; no other identity touched');
}
