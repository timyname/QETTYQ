import { redactDecimalCoordinates } from "./location-redaction";

export type RecentChatMessage = { role: "user" | "assistant"; text: string };
export const CHAT_PAYLOAD_SOFT_BYTES = 14 * 1024;
export const CHAT_HISTORY_MAX_BYTES = 6 * 1024;
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;

/** Unicode-codepoint safe, not a UTF-16 slice through an emoji/surrogate pair. */
function clip(text: string, maxBytes: number, maxCharacters: number) {
  let result = "", used = 0;
  for (const char of text) {
    const size = new TextEncoder().encode(char).byteLength;
    if (used + size > maxBytes || result.length + char.length > maxCharacters) break;
    result += char; used += size;
  }
  return result;
}

/** Six recent messages to the model is separate from 24 retained browser messages.
 * Free-text GPS redaction is best-effort, not a full personal-data classifier.
 */
export function normalizeChatHistory(input: unknown): RecentChatMessage[] {
  if (!Array.isArray(input)) return [];
  const history: RecentChatMessage[] = input.slice(-6).flatMap(value => {
    if (!value || typeof value !== "object" || !["user", "assistant"].includes(value.role) || typeof value.text !== "string") return [];
    const text = clip(redactDecimalCoordinates(value.text, "[координата скрыта]"), 1600, 1000);
    return text ? [{ role: value.role as RecentChatMessage["role"], text }] : [];
  });
  while (history.length && bytes(history) > CHAT_HISTORY_MAX_BYTES) history.shift();
  return history;
}

/** More cheap deterministic dialogue turns, not a larger model prompt. The
 * total UTF-8 budget stays identical to the six-message provider context. */
export function normalizeDialogueHistory(input: unknown): RecentChatMessage[] {
  if (!Array.isArray(input)) return [];
  const history: RecentChatMessage[] = input.slice(-20).flatMap(value => {
    if (!value || typeof value !== "object" || !["user", "assistant"].includes(value.role) || typeof value.text !== "string") return [];
    const text = clip(redactDecimalCoordinates(value.text, "[координата скрыта]"), 1600, 1000);
    return text ? [{ role: value.role as RecentChatMessage["role"], text }] : [];
  });
  while (history.length && bytes(history) > CHAT_HISTORY_MAX_BYTES) history.shift();
  return history;
}

/** Root API should call after readJson; client must also bound the complete serialized
 * POST BEFORE fetch, because the HTTP reader rejects >16 KiB before normalization.
 * Never silently discard current text, location consent, or budget constraints.
 */
export function boundChatPayload<T extends { history?: unknown }>(payload: T): Omit<T, "history"> & { history: RecentChatMessage[] } {
  const result = { ...payload, history: normalizeDialogueHistory(payload.history) };
  while (result.history.length && bytes(result) > CHAT_PAYLOAD_SOFT_BYTES) result.history.shift();
  if (bytes(result) > CHAT_PAYLOAD_SOFT_BYTES) throw new Error("CHAT_CORE_PAYLOAD_TOO_LARGE");
  return result;
}
