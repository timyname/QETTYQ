import type { ChatContextOrigin, LocalChatMessage } from "./local-memory";

export type AiTransferConsent = { active: boolean; expiresAt: string };
export type ChatHistoryPolicy = {
  forAI: boolean;
  aiTransferConsent?: AiTransferConsent | null;
  now?: number;
};

/** The cached UI's active flag may outlive its actual server consent TTL. */
export function isAiTransferConsentActive(consent: AiTransferConsent | null | undefined, now = Date.now()): boolean {
  if (!consent || consent.active !== true || !Number.isFinite(now)) return false;
  const expiresAt = Date.parse(consent.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

/** Select before mapping to the wire DTO; dropping provenance first loses the
 * privacy boundary. Rendering/deletion are separate from permission to use AI.
 * Existing final message/byte bounds remain the payload builder's responsibility.
 */
export function selectChatHistory(messages: readonly LocalChatMessage[], policy: ChatHistoryPolicy): LocalChatMessage[] {
  if (!policy.forAI || isAiTransferConsentActive(policy.aiTransferConsent, policy.now)) return [...messages];
  return messages.filter(message => message.contextOrigin === "device");
}

/** A local deterministic reply can quote protected history. Preserve that
 * dependency instead of laundering its contents into a fresh device-only turn.
 * Pass the exact selected history that was used for the request, not all UI rows.
 */
export function inferReplyContextOrigin(history: readonly LocalChatMessage[]): ChatContextOrigin {
  if (history.some(message => message.contextOrigin !== "device" && message.contextOrigin !== "server")) return "legacy_unknown";
  return history.some(message => message.contextOrigin === "server") ? "server" : "device";
}
