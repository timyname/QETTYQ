import { expect, type Page } from '@playwright/test';
import { answerPilotChat } from '../../src/server/pilot/chat';
import { localizedSearchReply } from '../../src/server/pilot/chat-language';
import type { PilotContext } from '../../src/server/pilot/contracts';

/** UI-only fixtures: local catalogue facts, no event/provider/AI requests.
 * Individual specs can override a route afterwards to test a failure or synthetic data.
 * Real HTTP+SQLite memory is independently checked in qa-language-memory.spec.ts. */
export async function installOfflineTestGuards(page: Page) {
  page.setDefaultTimeout(10_000);
  await page.route('**/api/assistant/status', route => route.fulfill({ json: { available: false, configured: false, reason: 'API_KEY_MISSING', localTestOnly: false } }));
  await page.route('**/api/chat', route => {
    const body = route.request().postDataJSON() as { text: string; context: PilotContext; language?: 'ru' | 'kk' | 'en' };
    const result = { ...answerPilotChat(body.text, body.context), events: [] };
    return route.fulfill({ json: { ...result, reply: localizedSearchReply(body.language ?? 'ru', result), mode: 'deterministic', citations: [], reason: 'QA_OFFLINE_CATALOG_FIXTURE', dataMode: 'snapshot' } });
  });
  await page.route('**/api/memory', route => route.fulfill({ json: { available: true, enabled: false, storageMode: 'sqlite_opt_in', historyTrust: 'untrusted_personal_context', profile: null, messages: [], visits: [], expiresAt: null, consents: { profile: null, dialogue: null, ai_transfer: null, visits: null }, ...(route.request().method() === 'DELETE' ? { deleted: true } : {}) } }));
  await page.route('https://api.openai.com/**', route => route.abort());
  await page.route('https://maps.googleapis.com/**', route => route.abort());
}

export async function openRussianApp(page: Page) {
  await page.goto('/');
  await page.getByRole('main', { name: 'Language selection' }).getByRole('button', { name: 'Русский', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Выбрать свой вайб', exact: true })).toBeEnabled();
}
