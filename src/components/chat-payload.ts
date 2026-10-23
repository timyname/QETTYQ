import { normalizeDialogueHistory } from '../server/pilot/chat-history';

export const CHAT_BODY_LIMIT_BYTES = 14 * 1024;
type Message = { role: 'user' | 'assistant'; text: string };
/** The API caps the whole request at 16 KiB; reserve headroom before fetch. */
export function boundedChatPayload<T>(text: string, context: T, history: Message[], useAI: boolean, language: 'ru' | 'kk' | 'en' = 'ru', googleConsent = false) {
  const payload = { text, context, history: normalizeDialogueHistory(history), useAI, language, googleConsent };
  const bytes = () => new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  while (payload.history.length && bytes() > CHAT_BODY_LIMIT_BYTES) payload.history.shift();
  if (bytes() > CHAT_BODY_LIMIT_BYTES) throw new Error('Запрос слишком большой. Сократи сообщение и повтори.');
  return payload;
}
export function aiConsentLabel(consent: boolean, available: boolean) {
  return consent ? available ? 'AI-объяснение разрешено' : 'Согласие сохранено · AI недоступен' : available ? 'Разрешить AI-объяснение' : 'AI пока недоступен';
}
