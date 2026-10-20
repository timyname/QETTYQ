import type { ReactionInput } from "./schemas";
import type { PilotContext } from "../pilot/contracts";
import type { StoredPlan } from "../pilot/plans";

export const SESSION_TTL_SECONDS = 24 * 60 * 60;
const MAX_SESSIONS = 10_000;
const MAX_REACTIONS_PER_SESSION = 500;
const MAX_IDEMPOTENCY_RECORDS = 750;

export type ReactionRecord = ReactionInput & {
  id: string;
  sequence: number;
  createdAt: string;
  undoneAt: string | null;
};

export type PreferenceProfile = {
  weights: Record<string, number>;
  version: number;
};

type StoredResult =
  | { kind: "reaction"; fingerprint: string; result: ReactionMutationResult }
  | { kind: "undo"; fingerprint: string; result: UndoMutationResult };

export type SessionRecord = {
  id: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  nextSequence: number;
  reactions: ReactionRecord[];
  profile: PreferenceProfile;
  idempotency: Map<string, StoredResult>;
  retiredIdempotencyKeys: Set<string>;
  context: PilotContext | null;
  plans: StoredPlan[];
  chatRequestTimes: number[];
};

export type ReactionMutationResult = {
  reaction: ReactionRecord;
  profile: PreferenceProfile;
  replayed: boolean;
};

export type UndoMutationResult = {
  reaction: ReactionRecord;
  profile: PreferenceProfile;
  replayed: boolean;
};

export class SessionStoreError extends Error {
  constructor(
    public readonly code:
      | "SESSION_CAPACITY_REACHED"
      | "REACTION_LIMIT_REACHED"
      | "IDEMPOTENCY_CONFLICT"
      | "NOTHING_TO_UNDO",
  ) {
    super(code);
  }
}

type StoreState = { sessions: Map<string, SessionRecord> };

const globalForSessions = globalThis as typeof globalThis & {
  __qettyqSessionStore?: StoreState;
};

const state =
  globalForSessions.__qettyqSessionStore ??
  (globalForSessions.__qettyqSessionStore = { sessions: new Map() });

function nowIso(now: number) {
  return new Date(now).toISOString();
}

function cloneProfile(profile: PreferenceProfile): PreferenceProfile {
  return { weights: { ...profile.weights }, version: profile.version };
}

function cloneReaction(reaction: ReactionRecord): ReactionRecord {
  return { ...reaction, tags: [...reaction.tags] };
}

function cleanExpired(now: number) {
  for (const [id, session] of state.sessions) {
    if (Date.parse(session.expiresAt) <= now) state.sessions.delete(id);
  }
}

function capIdempotency(session: SessionRecord) {
  while (session.idempotency.size > MAX_IDEMPOTENCY_RECORDS) {
    const oldestKey = session.idempotency.keys().next().value as string | undefined;
    if (!oldestKey) return;
    session.idempotency.delete(oldestKey);
  }
  while (session.retiredIdempotencyKeys.size > MAX_IDEMPOTENCY_RECORDS) {
    const oldestKey = session.retiredIdempotencyKeys.values().next().value as
      | string
      | undefined;
    if (!oldestKey) return;
    session.retiredIdempotencyKeys.delete(oldestKey);
  }
}

function normalizedFingerprint(value: unknown) {
  return JSON.stringify(value);
}

function preferenceDelta(action: ReactionInput["action"], tagCount: number) {
  if (tagCount === 0) return 0;
  if (action === "like") return 1 / tagCount;
  if (action === "dislike") return -1 / tagCount;
  return 0;
}

function applyPreferenceDelta(
  profile: PreferenceProfile,
  reaction: ReactionRecord,
  direction: 1 | -1,
) {
  const delta = preferenceDelta(reaction.action, reaction.tags.length) * direction;
  if (delta === 0) return;

  for (const tag of reaction.tags) {
    const next = Math.max(-5, Math.min(5, (profile.weights[tag] ?? 0) + delta));
    if (Math.abs(next) < Number.EPSILON) delete profile.weights[tag];
    else profile.weights[tag] = Number(next.toFixed(6));
  }
}

function rebuildPreferenceWeights(session: SessionRecord) {
  session.profile.weights = {};
  for (const reaction of session.reactions) {
    if (reaction.undoneAt === null) applyPreferenceDelta(session.profile, reaction, 1);
  }
}

export function createSession(now = Date.now()): SessionRecord {
  cleanExpired(now);
  if (state.sessions.size >= MAX_SESSIONS) {
    throw new SessionStoreError("SESSION_CAPACITY_REACHED");
  }

  const id = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().slice(0, 11);
  const session: SessionRecord = {
    id,
    createdAt: nowIso(now),
    expiresAt: nowIso(now + SESSION_TTL_SECONDS * 1_000),
    lastSeenAt: nowIso(now),
    nextSequence: 1,
    reactions: [],
    profile: { weights: {}, version: 0 },
    idempotency: new Map(),
    retiredIdempotencyKeys: new Set(),
    context: null,
    plans: [],
    chatRequestTimes: [],
  };
  state.sessions.set(id, session);
  return session;
}

export function getSession(id: string, now = Date.now()): SessionRecord | null {
  const session = state.sessions.get(id);
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= now) {
    state.sessions.delete(id);
    return null;
  }
  // Keep existing development sessions readable across a hot reload that adds pilot fields.
  session.context ??= null;
  session.plans ??= [];
  session.chatRequestTimes ??= [];
  session.lastSeenAt = nowIso(now);
  return session;
}

export function recordReaction(
  session: SessionRecord,
  input: ReactionInput,
  idempotencyKey: string,
  now = Date.now(),
): ReactionMutationResult {
  const fingerprint = normalizedFingerprint(input);
  if (session.retiredIdempotencyKeys.has(idempotencyKey)) {
    throw new SessionStoreError("IDEMPOTENCY_CONFLICT");
  }
  const existing = session.idempotency.get(idempotencyKey);
  if (existing) {
    if (existing.kind !== "reaction" || existing.fingerprint !== fingerprint) {
      throw new SessionStoreError("IDEMPOTENCY_CONFLICT");
    }
    return {
      reaction: cloneReaction(existing.result.reaction),
      profile: cloneProfile(existing.result.profile),
      replayed: true,
    };
  }
  if (session.reactions.length >= MAX_REACTIONS_PER_SESSION) {
    throw new SessionStoreError("REACTION_LIMIT_REACHED");
  }

  const reaction: ReactionRecord = {
    ...input,
    tags: [...input.tags],
    id: crypto.randomUUID(),
    sequence: session.nextSequence++,
    createdAt: nowIso(now),
    undoneAt: null,
  };
  session.reactions.push(reaction);
  rebuildPreferenceWeights(session);
  session.profile.version += 1;

  const result = {
    reaction: cloneReaction(reaction),
    profile: cloneProfile(session.profile),
    replayed: false,
  };
  session.idempotency.set(idempotencyKey, {
    kind: "reaction",
    fingerprint,
    result,
  });
  capIdempotency(session);
  return result;
}

export function undoLastReaction(
  session: SessionRecord,
  idempotencyKey: string,
  now = Date.now(),
): UndoMutationResult {
  const fingerprint = "undo:last-active";
  if (session.retiredIdempotencyKeys.has(idempotencyKey)) {
    throw new SessionStoreError("IDEMPOTENCY_CONFLICT");
  }
  const existing = session.idempotency.get(idempotencyKey);
  if (existing) {
    if (existing.kind !== "undo" || existing.fingerprint !== fingerprint) {
      throw new SessionStoreError("IDEMPOTENCY_CONFLICT");
    }
    return {
      reaction: cloneReaction(existing.result.reaction),
      profile: cloneProfile(existing.result.profile),
      replayed: true,
    };
  }

  const reaction = session.reactions.findLast((item) => item.undoneAt === null);
  if (!reaction) throw new SessionStoreError("NOTHING_TO_UNDO");

  reaction.undoneAt = nowIso(now);
  rebuildPreferenceWeights(session);
  session.profile.version += 1;

  const result = {
    reaction: cloneReaction(reaction),
    profile: cloneProfile(session.profile),
    replayed: false,
  };
  session.idempotency.set(idempotencyKey, {
    kind: "undo",
    fingerprint,
    result,
  });
  capIdempotency(session);
  return result;
}

export function deleteSessionData(session: SessionRecord) {
  const removed = {
    reactions: session.reactions.length,
    preferenceTags: Object.keys(session.profile.weights).length,
    plans: session.plans.length,
  };
  session.reactions = [];
  session.profile = { weights: {}, version: 0 };
  session.context = null;
  session.plans = [];
  session.chatRequestTimes = [];
  session.nextSequence = 1;
  for (const key of session.idempotency.keys()) session.retiredIdempotencyKeys.add(key);
  session.idempotency.clear();
  capIdempotency(session);
  return removed;
}

export function resetSessionStoreForTests() {
  state.sessions.clear();
}
