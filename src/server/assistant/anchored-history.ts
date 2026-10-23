import { CHAT_HISTORY_MAX_BYTES, normalizeDialogueHistory, type RecentChatMessage } from '../pilot/chat-history';

/** Internal server result, never an accepted browser DTO. Only persisted server
 * write times may populate the aligned vector; message prose remains untrusted. */
export function normalizePersistedDialogueHistory(messages: readonly {
  role: 'user' | 'assistant'; text: string; createdAtMs: number;
}[], now: number): { history: RecentChatMessage[]; historyCreatedAtMs: number[]; omittedHistoryCount: number } {
  const valid = messages.filter(message => Number.isSafeInteger(message.createdAtMs)
    && message.createdAtMs >= 0 && message.createdAtMs <= now);
  const bounded = valid.slice(-20).flatMap(message => {
    const normalized = normalizeDialogueHistory([message])[0];
    return normalized ? [{ message: normalized, createdAtMs: message.createdAtMs }] : [];
  });
  while (bounded.length && new TextEncoder().encode(JSON.stringify(bounded.map(value => value.message))).byteLength > CHAT_HISTORY_MAX_BYTES) bounded.shift();
  return { history: bounded.map(value => value.message), historyCreatedAtMs: bounded.map(value => value.createdAtMs),
    // Deliberately only invalid/future clock rows, not normal size trimming.
    omittedHistoryCount: messages.length - valid.length };
}

export const astanaCalendarDay = (time: number) => new Date(time + 5 * 3_600_000).toISOString().slice(0, 10);
