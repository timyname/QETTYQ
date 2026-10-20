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
export type MemoryAIContext = { preferences: MemoryPreferences | null; history: { role: "user" | "assistant"; text: string }[]; visits: MemoryVisit[] };
export type MemoryExchange = { userMessageId: string; userText: string; assistantMessageId: string; assistantText: string; mode: "openai" | "deterministic" };
export type MemoryOperation = "state" | "grant" | "revoke" | "profile" | "message" | "visit" | "delete";
export type MemoryService = {
  handle(request: Request, operation: MemoryOperation): Promise<Response>;
  readForAI(request: Request): Promise<MemoryAIContext | null>;
  recordExchange(request: Request, exchange: MemoryExchange): Promise<{ stored: boolean; reason: string | null }>;
  dispose?(): void;
};
