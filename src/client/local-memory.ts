import type { Goal } from "@/domain/types";
import type { Locale } from "@/data/events";

export const LOCAL_MEMORY_KEY = "qettyq.local-memory.v1";
export const LOCAL_MEMORY_VERSION = 1;
export const MAX_CHAT_MESSAGES = 24;
export const MAX_MESSAGE_CHARS = 500;

export type LocalChatRole = "user" | "assistant";

export type LocalChatMessage = {
  id: string;
  role: LocalChatRole;
  text: string;
  createdAt: string;
  mode: "user" | "deterministic";
};

export type LocalPreferenceProfile = {
  locale: Locale;
  goal: Goal;
  minutes: number;
  budget: number;
  likedTags: string[];
};

export type LocalMemory = {
  version: typeof LOCAL_MEMORY_VERSION;
  updatedAt: string;
  profile: LocalPreferenceProfile;
  dialogue: LocalChatMessage[];
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const goals = new Set<Goal>(["food", "walk", "activity", "new"]);
const locales = new Set<Locale>(["ru", "kk", "en"]);
const roles = new Set<LocalChatRole>(["user", "assistant"]);
const modes = new Set<LocalChatMessage["mode"]>(["user", "deterministic"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function safeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().toLocaleLowerCase("ru-RU"))
    .filter((tag) => /^[\p{L}\p{N}][\p{L}\p{N} _-]{0,47}$/u.test(tag)))]
    .slice(0, 24);
}

function safeMessage(value: unknown): LocalChatMessage | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || value.id.length < 1 || value.id.length > 128) return null;
  if (typeof value.role !== "string" || !roles.has(value.role as LocalChatRole)) return null;
  if (typeof value.mode !== "string" || !modes.has(value.mode as LocalChatMessage["mode"])) return null;
  if (typeof value.text !== "string") return null;
  const text = value.text.trim().slice(0, MAX_MESSAGE_CHARS);
  if (!text) return null;
  const createdAt = typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt))
    ? value.createdAt
    : new Date(0).toISOString();
  return {
    id: value.id,
    role: value.role as LocalChatRole,
    mode: value.mode as LocalChatMessage["mode"],
    text,
    createdAt,
  };
}

export function createDefaultLocalMemory(now = new Date()): LocalMemory {
  return {
    version: LOCAL_MEMORY_VERSION,
    updatedAt: now.toISOString(),
    profile: { locale: "ru", goal: "new", minutes: 120, budget: 5000, likedTags: [] },
    dialogue: [],
  };
}

export function parseLocalMemory(raw: string | null, now = new Date()): LocalMemory {
  const fallback = createDefaultLocalMemory(now);
  if (!raw) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== LOCAL_MEMORY_VERSION || !isRecord(value.profile)) return fallback;
    const profile = value.profile;
    const dialogue = Array.isArray(value.dialogue)
      ? value.dialogue.map(safeMessage).filter((item): item is LocalChatMessage => item !== null).slice(-MAX_CHAT_MESSAGES)
      : [];
    return {
      version: LOCAL_MEMORY_VERSION,
      updatedAt: typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))
        ? value.updatedAt
        : fallback.updatedAt,
      profile: {
        locale: typeof profile.locale === "string" && locales.has(profile.locale as Locale) ? profile.locale as Locale : fallback.profile.locale,
        goal: typeof profile.goal === "string" && goals.has(profile.goal as Goal) ? profile.goal as Goal : fallback.profile.goal,
        minutes: clampInteger(profile.minutes, fallback.profile.minutes, 30, 360),
        budget: clampInteger(profile.budget, fallback.profile.budget, 0, 1_000_000),
        likedTags: safeTags(profile.likedTags),
      },
      dialogue,
    };
  } catch {
    return fallback;
  }
}

export function loadLocalMemory(storage: StorageLike, now = new Date()) {
  return parseLocalMemory(storage.getItem(LOCAL_MEMORY_KEY), now);
}

export function saveLocalMemory(storage: StorageLike, memory: LocalMemory, now = new Date()) {
  const normalized = parseLocalMemory(JSON.stringify({ ...memory, updatedAt: now.toISOString() }), now);
  storage.setItem(LOCAL_MEMORY_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearLocalMemory(storage: StorageLike) {
  storage.removeItem(LOCAL_MEMORY_KEY);
}

export function appendLocalMessage(memory: LocalMemory, message: LocalChatMessage): LocalMemory {
  const safe = safeMessage(message);
  if (!safe) return memory;
  return { ...memory, dialogue: [...memory.dialogue, safe].slice(-MAX_CHAT_MESSAGES) };
}
