import { describe, expect, it } from 'vitest';
import { inferReplyContextOrigin, isAiTransferConsentActive, selectChatHistory } from '../../src/client/chat-memory-context';
import { appendLocalMessage, createDefaultLocalMemory, parseLocalMemory, type LocalChatMessage } from '../../src/client/local-memory';
import { boundedChatPayload, CHAT_BODY_LIMIT_BYTES } from '../../src/components/chat-payload';

const now = Date.parse('2026-10-24T12:00:00Z');
const consent = { active: true, expiresAt: '2026-10-25T12:00:00Z' };
const message = (id: string, contextOrigin?: LocalChatMessage['contextOrigin']): LocalChatMessage => ({
  id, role: 'user', mode: 'user', text: `synthetic-${id}`, createdAt: new Date(now).toISOString(), contextOrigin,
});
const all = [message('device', 'device'), message('server', 'server'), message('legacy', 'legacy_unknown')];

describe('AI context provenance and granular transfer consent', () => {
  it.each([undefined, null, { active: false, expiresAt: consent.expiresAt }, { active: true, expiresAt: 'invalid' },
    { active: true, expiresAt: new Date(now).toISOString() }, { active: true, expiresAt: new Date(now - 1).toISOString() }])(
    'excludes server/legacy history when consent is unavailable or inactive: %j', aiTransferConsent => {
      expect(selectChatHistory(all, { forAI: true, aiTransferConsent, now }).map(row => row.id)).toEqual(['device']);
    },
  );

  it('requires a strict active flag and a finite clock, not a truthy value', () => {
    expect(isAiTransferConsentActive({ ...consent, active: 1 } as unknown as typeof consent, now)).toBe(false);
    expect(isAiTransferConsentActive(consent, Number.NaN)).toBe(false);
    expect(isAiTransferConsentActive(consent, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('allows protected context only until the actual TTL, then closes without waiting for UI refresh', () => {
    expect(selectChatHistory(all, { forAI: true, aiTransferConsent: consent, now })).toEqual(all);
    expect(selectChatHistory(all, { forAI: true, aiTransferConsent: consent, now: Date.parse(consent.expiresAt) })).toEqual([all[0]]);
  });

  it('keeps the complete displayed/deterministic transcript without mutating it', () => {
    const before = JSON.stringify(all);
    const result = selectChatHistory(all, { forAI: false, now });
    expect(result).toEqual(all); expect(result).not.toBe(all);
    expect(JSON.stringify(all)).toBe(before);
  });

  it('blocks actual server JSON round-trip history after revoke while leaving it visible locally', () => {
    const memory = parseLocalMemory(JSON.stringify({ ...createDefaultLocalMemory(), dialogue: all }));
    const allowed = selectChatHistory(memory.dialogue, { forAI: true, aiTransferConsent: consent, now });
    expect(allowed).toHaveLength(3);
    const afterReload = parseLocalMemory(JSON.stringify(memory));
    const selected = selectChatHistory(afterReload.dialogue, { forAI: true, aiTransferConsent: null, now });
    const payload = boundedChatPayload('Прогулка завтра', {}, selected, true);
    expect(payload.history.map(row => row.text)).toEqual(['synthetic-device']);
    expect(afterReload.dialogue).toHaveLength(3);
  });

  it('fails closed even for an unparsed message without provenance', () => {
    expect(selectChatHistory([message('missing')], { forAI: true, now })).toEqual([]);
  });

  it('preserves current two-turn local conversation without granting server-memory transfer', () => {
    let memory = createDefaultLocalMemory();
    for (const row of [message('local-user'), { ...message('local-assistant'), role: 'assistant' as const, mode: 'deterministic' as const }]) memory = appendLocalMessage(memory, row);
    const restored = parseLocalMemory(JSON.stringify(memory));
    const selected = selectChatHistory(restored.dialogue, { forAI: true, now });
    expect(boundedChatPayload('Завтра, бюджет 5000 ₸', {}, selected, true).history.map(row => row.text)).toEqual(['synthetic-local-user', 'synthetic-local-assistant']);
  });

  it('does not launder deterministic answers derived from protected history into device context', () => {
    expect(inferReplyContextOrigin([message('device', 'device')])).toBe('device');
    expect(inferReplyContextOrigin([message('server', 'server')])).toBe('server');
    expect(inferReplyContextOrigin([message('server', 'server'), message('unknown')])).toBe('legacy_unknown');
    const reply = { ...message('derived-answer', inferReplyContextOrigin(all)), role: 'assistant' as const };
    expect(selectChatHistory([reply], { forAI: true, now })).toEqual([]);
  });

  it('retains existing 24-message storage and bounded dialogue payload without provenance fields', () => {
    let memory = createDefaultLocalMemory();
    for (let index = 0; index < 30; index++) memory = appendLocalMessage(memory, { ...message(`new-${index}`), text: 'Қ'.repeat(2000) });
    expect(memory.dialogue).toHaveLength(24);
    const selected = selectChatHistory(memory.dialogue, { forAI: true, now });
    const payload = boundedChatPayload('Прогулка', {}, selected, true);
    expect(payload.history).toHaveLength(3);
    expect(new TextEncoder().encode(JSON.stringify(payload)).byteLength).toBeLessThanOrEqual(CHAT_BODY_LIMIT_BYTES);
    expect(JSON.stringify(payload)).not.toContain('contextOrigin');
  });
});
