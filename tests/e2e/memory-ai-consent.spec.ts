import { expect, test, type Page } from '@playwright/test';
import { createDefaultLocalMemory, LOCAL_MEMORY_KEY, type LocalChatMessage } from '../../src/client/local-memory';

/** UI-only privacy regression. Every API/provider is mocked; no personal data,
 * actual LLM, Google, ingestion or server-memory write is used. */
const now = '2026-10-24T07:00:00.000Z';
const protectedMarker = 'QA_PROTECTED_SERVER_CONTEXT_7A31';
const derivedMarker = 'QA_SERVER_DERIVED_REPLY_09AC';
const legacyMarker = 'QA_LEGACY_UNKNOWN_ORIGIN_F68D';
const active = { active: true, expiresAt: '2026-10-25T07:00:00.000Z' };
type Consent = { active: boolean; expiresAt: string } | null;
type ChatPayload = { text: string; history: Array<{ role: string; text: string }>; useAI: boolean; googleConsent: boolean };

async function fixture(page: Page, options: {
  serverHistory?: boolean;
  consent?: (getCount: number) => Consent;
  beforeMemoryRead?: (getCount: number) => Promise<void>;
  legacy?: boolean;
  reply?: (requestCount: number) => string;
} = {}) {
  let memoryReads = 0;
  const payloads: ChatPayload[] = [];
  const requests: Array<{ path: string; method: string; host: string }> = [];
  const memory = createDefaultLocalMemory(new Date(now));
  if (options.legacy) memory.dialogue = [{ id: 'qa-old-browser-row', role: 'user', mode: 'user', text: legacyMarker, createdAt: now }];
  await page.addInitScript(({ key, initial }) => {
    localStorage.setItem('qettyq.language.v1', 'ru');
    localStorage.setItem('qettyq.screen.v1', 'chat');
    localStorage.setItem('qettyq.assistant-providers.v1', JSON.stringify({ ai: true, google: false }));
    if (!localStorage.getItem('qa.memory-ai-consent.seeded')) {
      localStorage.setItem(key, JSON.stringify(initial));
      localStorage.setItem('qa.memory-ai-consent.seeded', 'true');
    }
  }, { key: LOCAL_MEMORY_KEY, initial: memory });
  await page.clock.setFixedTime(new Date(now));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    requests.push({ path: url.pathname, method: request.method(), host: url.hostname });
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const respond = (json: unknown) => route.fulfill({ json });
    if (url.pathname === '/api/session') return respond({ session: { id: 'synthetic-ai-consent-session' } });
    if (url.pathname === '/api/catalog') return respond({ items: [], dataMode: 'snapshot' });
    if (url.pathname === '/api/events') return respond({ items: [], dataMode: 'unavailable', warnings: ['QA_OFFLINE'] });
    if (url.pathname === '/api/maps/config') return respond({ enabled: false, provider: 'openstreetmap' });
    if (url.pathname === '/api/assistant/status') return respond({ available: true, configured: true, localTestOnly: true, reason: null });
    if (url.pathname === '/api/memory' && request.method() === 'GET') {
      const read = ++memoryReads;
      await options.beforeMemoryRead?.(read);
      return respond({ available: true, enabled: Boolean(options.serverHistory), storageMode: 'sqlite_opt_in', historyTrust: 'untrusted_personal_context',
        consents: { profile: null, dialogue: options.serverHistory ? active : null, ai_transfer: options.consent?.(read) ?? null, visits: null }, profile: null,
        messages: options.serverHistory ? [{ id: 'qa-restored-private-server-row', role: 'user', mode: 'user', text: protectedMarker, createdAtMs: Date.parse(now) - 60_000 }] : [], visits: [], expiresAt: active.expiresAt });
    }
    if (url.pathname === '/api/chat') {
      payloads.push(request.postDataJSON() as ChatPayload);
      return respond({ reply: options.reply?.(payloads.length) ?? `QA_MOCK_ASSISTANT_REPLY_${payloads.length}`, mode: 'openai', items: [], events: [], citations: [], dataMode: 'synthetic_test' });
    }
    return route.fulfill({ status: 503, json: { error: { code: 'QA_OFFLINE_UNHANDLED_API' } } });
  });
  await page.goto('/');
  await expect(page.locator('[data-screen="chat"]')).toBeVisible();
  await expect.poll(() => memoryReads).toBeGreaterThanOrEqual(1);
  await page.getByRole('textbox', { name: 'Сообщение помощнику', exact: true }).fill('QA readiness check, not submitted');
  await expect(page.getByRole('button', { name: 'Отправить сообщение', exact: true })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Сообщение помощнику', exact: true }).fill('');
  return { payloads, requests, reads: () => memoryReads };
}

const log = (page: Page) => page.getByRole('log', { name: 'Диалог с помощником', exact: true });
async function startSend(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Сообщение помощнику', exact: true }).fill(text);
  await page.getByRole('button', { name: 'Отправить сообщение', exact: true }).click();
}
async function sent(page: Page, payloads: ChatPayload[], count: number) {
  await expect.poll(() => payloads.length).toBe(count);
  expect(payloads[count - 1].useAI).toBe(true);
  expect(payloads[count - 1].googleConsent).toBe(false);
  await expect(log(page).getByRole('status')).toHaveCount(0);
  return payloads[count - 1];
}
function providersStayedOffline(requests: Array<{ path: string; method: string; host: string }>) {
  expect(requests.filter(request => !['127.0.0.1', 'localhost'].includes(request.host))).toEqual([]);
  expect(requests.filter(request => request.path.startsWith('/api/memory') && request.method !== 'GET')).toEqual([]);
}

test('restored history stays visible but missing, expired and revoked AI-transfer consent exclude it', async ({ page }) => {
  const variants: Consent[] = [null, { active: true, expiresAt: '2026-10-23T07:00:00.000Z' }, { active: false, expiresAt: active.expiresAt }];
  let current = variants[0];
  const state = await fixture(page, { serverHistory: true, consent: () => current });
  for (let index = 0; index < variants.length; index++) {
    current = variants[index];
    if (index) await page.reload();
    await expect(log(page).getByText(protectedMarker, { exact: true })).toBeVisible();
    const message = `QA_CURRENT_USER_WITHOUT_TRANSFER_${index}`;
    await startSend(page, message);
    const payload = await sent(page, state.payloads, index + 1);
    expect(payload.text).toBe(message);
    expect(JSON.stringify(payload.history)).not.toContain(protectedMarker);
    await expect(log(page).getByText(protectedMarker, { exact: true })).toBeVisible();
    await expect(log(page).getByText(message, { exact: true })).toBeVisible();
  }
  providersStayedOffline(state.requests);
});

test('fresh denied server consent overrides cached active state without erasing the pending user turn', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const state = await fixture(page, { serverHistory: true, consent: count => count === 1 ? active : null, beforeMemoryRead: async count => { if (count === 2) await gate; } });
  await expect(log(page).getByText(protectedMarker, { exact: true })).toBeVisible();
  const pendingUser = 'QA_PENDING_USER_MUST_SURVIVE_FRESH_CONSENT_CHECK';
  await startSend(page, pendingUser);
  await expect.poll(state.reads).toBe(2);
  expect(state.payloads).toHaveLength(0);
  await expect(log(page).getByText(pendingUser, { exact: true })).toBeVisible();
  release();
  const payload = await sent(page, state.payloads, 1);
  expect(JSON.stringify(payload.history)).not.toContain(protectedMarker);
  await expect(log(page).getByText(protectedMarker, { exact: true })).toBeVisible();
  await expect(log(page).getByText(pendingUser, { exact: true })).toBeVisible();
  providersStayedOffline(state.requests);
  await page.screenshot({ path: 'output/playwright/memory-ai-consent/fresh-denied-retains-ui.png' });
});

test('legacy origin fails closed while newly device-authored two-turn context survives reload', async ({ page }) => {
  const state = await fixture(page, { legacy: true });
  await expect(log(page).getByText(legacyMarker, { exact: true })).toBeVisible();
  const firstUser = 'QA_DEVICE_FIRST_TURN_ABOUT_A_DATE';
  await startSend(page, firstUser);
  const first = await sent(page, state.payloads, 1);
  expect(JSON.stringify(first.history)).not.toContain(legacyMarker);
  await expect(log(page).getByText('QA_MOCK_ASSISTANT_REPLY_1', { exact: true })).toBeVisible();
  await page.reload();
  await expect(log(page).getByText(firstUser, { exact: true })).toBeVisible();
  await expect(log(page).getByText(legacyMarker, { exact: true })).toBeVisible();
  await startSend(page, 'QA_DEVICE_SECOND_TURN_SAME_CONVERSATION');
  const second = await sent(page, state.payloads, 2);
  expect(second.history).toEqual([{ role: 'user', text: firstUser }, { role: 'assistant', text: 'QA_MOCK_ASSISTANT_REPLY_1' }]);
  expect(JSON.stringify(second.history)).not.toContain(legacyMarker);
  providersStayedOffline(state.requests);
});

test('a server-derived assistant reply is not laundered into AI context after transfer is revoked', async ({ page }) => {
  let consent: Consent = active;
  const state = await fixture(page, { serverHistory: true, consent: () => consent, reply: count => count === 1 ? derivedMarker : 'QA_SECOND_REPLY_AFTER_REVOKE' });
  await expect(log(page).getByText(protectedMarker, { exact: true })).toBeVisible();
  const deviceQuestion = 'QA_CURRENT_DEVICE_QUESTION_WITH_ACTIVE_PERMISSION';
  await startSend(page, deviceQuestion);
  const first = await sent(page, state.payloads, 1);
  expect(first.history).toContainEqual({ role: 'user', text: protectedMarker });
  await expect(log(page).getByText(derivedMarker, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(({ key, text }) => (JSON.parse(localStorage.getItem(key) ?? '{}').dialogue as LocalChatMessage[] | undefined)?.find(message => message.text === text)?.contextOrigin, { key: LOCAL_MEMORY_KEY, text: derivedMarker })).toBe('server');
  consent = null;
  const pendingUser = 'QA_NEW_USER_TURN_AFTER_SERVER_REVOCATION';
  await startSend(page, pendingUser);
  const second = await sent(page, state.payloads, 2);
  expect(second.history).toContainEqual({ role: 'user', text: deviceQuestion });
  expect(JSON.stringify(second.history)).not.toContain(protectedMarker);
  expect(JSON.stringify(second.history)).not.toContain(derivedMarker);
  await expect(log(page).getByText(derivedMarker, { exact: true })).toBeVisible();
  await expect(log(page).getByText(pendingUser, { exact: true })).toBeVisible();
  expect(state.reads()).toBe(3);
  providersStayedOffline(state.requests);
});
