import seed from "../../../data/livedata/sxodim-astana-2026-10-20.json";
import { EVENT_REFRESH_MS, fetchLiveAstanaEvents, type SxodimSnapshot } from "./sxodim-live";

export type LiveEventsResult = {
  dataMode: "live" | "snapshot" | "unavailable";
  freshness: "fresh" | "stale" | "unavailable";
  cacheStatus: "refresh" | "hit" | "stale-fallback" | "miss";
  fetchedAt: string | null; expiresAt: string | null;
  source: SxodimSnapshot["source"] | null;
  coverage: SxodimSnapshot["coverage"] | null;
  items: SxodimSnapshot["items"];
  warnings: string[];
};
type SnapshotCache = { read(): Promise<SxodimSnapshot | null>; write(snapshot: SxodimSnapshot): Promise<void> };
const baselineWarnings = ["Наличие мест и итоговую стоимость уточните у организатора.", "У событий без координат нет маркера на карте: адрес не заменяется выдуманной точкой."];

function isSnapshot(value: unknown): value is SxodimSnapshot {
  const data = value as SxodimSnapshot | null;
  return Boolean(data && data.source?.id === "sxodim-astana-noncommercial" && Number.isFinite(Date.parse(data.fetchedAt)) && Number.isFinite(Date.parse(data.expiresAt)) && Array.isArray(data.items) && data.items.length <= 50 && data.items.every(event => event?.cityId === "astana" && Number.isFinite(Date.parse(event.startsAt)) && event.requiredCredit?.text === "Давай Сходим"));
}

/** Cloudflare Cache API is local to a data center; not a global distributed rate limiter. */
export function cloudflareEventCache(): SnapshotCache {
  // v2 drops promotion-order caches after switching to near-date discovery priority.
  const key = new Request("https://qettyq-app.ablecorgi64.chatgpt.site/__qettyq_internal_cache/sxodim-astana-v2");
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  return {
    async read() {
      if (!cache) return null;
      try { const response = await cache.match(key); if (!response) return null; const data: unknown = await response.json(); return isSnapshot(data) ? data : null; } catch { return null; }
    },
    async write(snapshot) {
      if (!cache) return;
      // Keep a last-good snapshot for fallback, but its expiresAt still controls live status.
      try { await cache.put(key, Response.json(snapshot, { headers: { "cache-control": "public, max-age=86400" } })); } catch { /* in-memory last-good cache remains usable */ }
    },
  };
}

export function createLiveEventsService(options: { now?: () => number; load?: () => Promise<SxodimSnapshot>; cache?: SnapshotCache; fallback?: SxodimSnapshot | null } = {}) {
  let memory: SxodimSnapshot | null = null, inFlight: Promise<LiveEventsResult> | null = null, nextAttemptAt = 0, policyBlocked = false;
  const clock = options.now ?? Date.now, load = options.load ?? (() => fetchLiveAstanaEvents()), cache = options.cache ?? cloudflareEventCache();
  const fallback = options.fallback === undefined ? seed as SxodimSnapshot : options.fallback;
  const freshAt = (snapshot: SxodimSnapshot, now: number) => Date.parse(snapshot.expiresAt) > now && Date.parse(snapshot.fetchedAt) <= now && now - Date.parse(snapshot.fetchedAt) < EVENT_REFRESH_MS;
  function response(snapshot: SxodimSnapshot | null, cacheStatus: LiveEventsResult["cacheStatus"], error = false): LiveEventsResult {
    const now = clock(), fresh = !error && snapshot !== null && freshAt(snapshot, now);
    return { dataMode: snapshot ? fresh ? "live" : "snapshot" : "unavailable", freshness: snapshot ? fresh ? "fresh" : "stale" : "unavailable", cacheStatus, fetchedAt: snapshot?.fetchedAt ?? null, expiresAt: snapshot?.expiresAt ?? null, source: snapshot?.source ?? null, coverage: snapshot?.coverage ?? null,
      items: (snapshot?.items ?? []).filter(event => Date.parse(event.startsAt) >= now), warnings: [...baselineWarnings, ...(!fresh ? [snapshot ? "Источник сейчас недоступен. Показан сохранённый снимок, не живая афиша." : "Не удалось получить афишу; события не выдумываются."] : [])] };
  }
  async function refresh(): Promise<LiveEventsResult> {
    const now = clock();
    if (policyBlocked && now < nextAttemptAt) return { ...response(null, "miss", true), warnings: ["Правила источника изменились: импорт и показ приостановлены до проверки."] };
    if (memory && freshAt(memory, now)) return response(memory, "hit");
    const shared = await cache.read();
    if (shared && (!memory || shared.fetchedAt > memory.fetchedAt)) memory = shared;
    if (memory && freshAt(memory, now)) return response(memory, "hit");
    if (now < nextAttemptAt) return response(memory ?? fallback, memory || fallback ? "stale-fallback" : "miss", true);
    nextAttemptAt = now + EVENT_REFRESH_MS;
    try {
      const loaded = await load();
      if (!isSnapshot(loaded) || Date.parse(loaded.expiresAt) <= now || Date.parse(loaded.fetchedAt) > clock()) throw new Error("INVALID_LIVE_SNAPSHOT");
      memory = loaded;
      policyBlocked = false;
      await cache.write(loaded);
      return response(loaded, "refresh");
    } catch (error) {
      if (error instanceof Error && /^SOURCE_(REUSE|ROBOTS)_POLICY_REQUIRES_REVIEW$/.test(error.message)) {
        policyBlocked = true;
        return { ...response(null, "miss", true), warnings: ["Правила источника изменились: импорт и показ приостановлены до проверки."] };
      }
      return response(memory ?? fallback, memory || fallback ? "stale-fallback" : "miss", true);
    }
  }
  return { async get(): Promise<LiveEventsResult> {
    if (inFlight) return inFlight;
    inFlight = refresh();
    try { return await inFlight; } finally { inFlight = null; }
  } };
}

// One in-flight refresh per isolate/process; shared Cache API where available.
export const liveEventsService = createLiveEventsService();
