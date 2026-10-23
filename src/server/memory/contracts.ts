/** Node-free service contract. Personal history is untrusted user context, never catalog evidence. */
export type MemoryScope = "profile" | "dialogue" | "ai_transfer" | "visits";
export type MemoryPreferences = { likedTags: string[]; locale: "ru" | "kk" | "en"; goal?: "food" | "walk" | "activity" | "new"; minutes?: number; budget?: number | null };
export type MemoryMessage = { id: string; role: "user" | "assistant"; text: string; mode: "user" | "openai" | "deterministic"; createdAtMs: number };
export type MemoryVisit = { entityKind: "venue" | "event"; entityId: string; visitedAtMs: number; confirmation: "user_confirmed" };
export type MemoryState = {
  available: true; enabled: boolean; storageMode: "sqlite_opt_in";
  consents: Record<MemoryScope, { active: true; expiresAt: string } | null>;
  profile: MemoryPreferences | null; messages: MemoryMessage[]; visits: MemoryVisit[]; expiresAt: string | null;
  historyTrust: "untrusted_personal_context";
};
export type MemoryAIContext = { preferences: MemoryPreferences | null; history: { role: "user" | "assistant"; text: string }[]; visits: MemoryVisit[];
  /** Server-only persisted write clocks aligned with bounded history, not a wire input. */
  historyCreatedAtMs?: number[] };
/** Independent local-use scope. This value MUST NOT be passed to a model or
 * external search provider: only readForAI can authorize that transfer. Saved
 * settings remain untrusted preferences, not confirmed current constraints. */
export type MemoryDialogueContext = {
  usage: "local_deterministic_only";
  historyTrust: "untrusted_personal_context";
  historyWindow: "trusted_persisted_turn_dates";
  omittedHistoryCount: number;
  preferences: MemoryPreferences | null;
  history: { role: "user" | "assistant"; text: string }[];
  historyCreatedAtMs: number[];
};
export type MemoryExchange = { userMessageId: string; userText: string; assistantMessageId: string; assistantText: string; mode: "openai" | "deterministic" };
export type MemoryOperation = "state" | "grant" | "revoke" | "profile" | "message" | "visit" | "delete";
export type MemoryService = {
  handle(request: Request, operation: MemoryOperation): Promise<Response>;
  readForAI(request: Request): Promise<MemoryAIContext | null>;
  readForDialogue?(request: Request): Promise<MemoryDialogueContext | null>;
  recordExchange(request: Request, exchange: MemoryExchange): Promise<{ stored: boolean; reason: string | null }>;
  dispose?(): void;
};
