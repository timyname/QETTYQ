import { describe, expect, it } from 'vitest';
import { aiConsentLabel, boundedChatPayload, CHAT_BODY_LIMIT_BYTES } from '../../src/components/chat-payload';
import { markerIconPaths } from '../../src/components/map-marker-icons';

describe('owner UI review safeguards', () => {
  it('bounds the whole UTF-8 chat POST, not just character count', () => {
    const history = Array.from({ length: 24 }, () => ({ role: 'user' as const, text: '🦄'.repeat(1000) }));
    const body = boundedChatPayload('Куда сходить?', { likedTags: ['culture'], origin: null }, history, false);
    expect(body.history.length).toBeLessThanOrEqual(6);
    expect(new TextEncoder().encode(JSON.stringify(body)).byteLength).toBeLessThanOrEqual(CHAT_BODY_LIMIT_BYTES);
    expect(body.text).toBe('Куда сходить?');
  });
  it('preserves newest messages and never silently truncates the current request', () => {
    const history = Array.from({ length: 20 }, (_, index) => ({ role: 'assistant' as const, text: `${index}` }));
    expect(boundedChatPayload('Новое', {}, history, true).history.map(row => row.text)).toEqual(['14', '15', '16', '17', '18', '19']);
    expect(() => boundedChatPayload('x'.repeat(CHAT_BODY_LIMIT_BYTES), {}, [], false)).toThrow('Запрос слишком большой');
  });
  it('does not confuse AI consent with availability or successful model execution', () => {
    expect(aiConsentLabel(true, false)).toBe('Согласие сохранено · AI недоступен');
    expect(aiConsentLabel(true, true)).toBe('AI-объяснение разрешено');
    expect(aiConsentLabel(false, true)).toBe('Разрешить AI-объяснение');
  });
  it('gives verified food/theatre categories different icons, unknown gets a neutral pin', () => {
    const paths = ['fast_food', 'coffee', 'restaurant', 'cafe', 'theatre'].map(markerIconPaths);
    expect(new Set(paths.map(value => JSON.stringify(value))).size).toBe(5);
    expect(markerIconPaths('unknown')).toEqual(markerIconPaths('unverified fancy dinner'));
    expect(markerIconPaths('театр')).toEqual(markerIconPaths('theatre'));
  });
});
