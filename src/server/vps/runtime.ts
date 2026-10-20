import { constants, fstatSync, lstatSync, openSync, readFileSync, closeSync } from "node:fs";
import { isAbsolute } from "node:path";
import baselinePlaces from "../../../data/places.json";
import addressIndex from "../../../data/astana-address-index.json";
import { createAddressMatcher, enrichEventAddresses, type AddressIndex } from "../ingestion/address-match";
import { createEventVenueMatcher } from "../ingestion/event-geo-media";
import baselineEvents from "../../../data/livedata/sxodim-astana-2026-10-20.json";
import sourceRegistry from "../../../data/source-registry.json";
import sourceCandidates from "../../../data/event-source-candidates.json";
import type { Place } from "../../domain/types";
import { openDatastore, atomic } from "../datastore/sqlite";
import { createEventsStore } from "../datastore/events-store";
import { importD1Ledger, sqlitePublicAIDatabase, type AIReservationExport } from "../datastore/public-ai-sqlite";
import { sqliteRoutingDatabase } from "../datastore/routing-sqlite";
import { createLiveEventsService } from "../ingestion/live-events";
import { fetchLiveAstanaEvents, type SxodimSnapshot } from "../ingestion/sxodim-live";
import { PUBLIC_AI_APPROVAL_ID } from "../pilot/public-ai-budget";
import { createPublicAIRuntime } from "../pilot/public-ai-runtime";
import { reserveRoutingRequest } from "../pilot/routing-quota";
import { getHostedRuntime, setHostedRuntime, type HostedRuntime } from "../pilot/host-runtime";
import { createMemoryService } from "../memory/service";
import { DATA_HUB_SCHEMA_V1 } from "../data-hub/schema";
import { createDataHubRepository } from "../data-hub/repository";
import { createDataHubService } from "../data-hub/service";
import { createPublicDataHubFeed } from "../data-hub/public-feed";
import { createHubEventsBridge } from "../data-hub/events-bridge";

type LedgerProof = { source: "cloudflare-d1"; sourceFrozen: true; approvalId: typeof PUBLIC_AI_APPROVAL_ID; verifiedRowCount: number; rows: AIReservationExport[] };
function readVerifiedLedgerProof(path: string | undefined): LedgerProof {
  if (!path || !isAbsolute(path) || !path.endsWith(".json")) throw new Error("PUBLIC_LEDGER_EXPORT_PATH_REQUIRED");
  // Independently supplied runtime proof; never copy it into the build artifact.
  if (!lstatSync(/* turbopackIgnore: true */ path).isFile()) throw new Error("PUBLIC_LEDGER_EXPORT_INVALID");
  const file = openSync(/* turbopackIgnore: true */ path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = fstatSync(file);
    if (!info.isFile() || info.size > 1_000_000) throw new Error("PUBLIC_LEDGER_EXPORT_INVALID");
    const value = JSON.parse(readFileSync(/* turbopackIgnore: true */ file, "utf8")) as Partial<LedgerProof>;
    if (value.source !== "cloudflare-d1" || value.sourceFrozen !== true || value.approvalId !== PUBLIC_AI_APPROVAL_ID
      || !Array.isArray(value.rows) || value.rows.length > 1000 || !Number.isSafeInteger(value.verifiedRowCount)
      || value.verifiedRowCount !== value.rows.length) throw new Error("PUBLIC_LEDGER_EXPORT_INVALID");
    return value as LedgerProof;
  } finally { closeSync(file); }
}

export type VpsRuntime = HostedRuntime & {
  diagnostics: { ledgerReady: boolean; ledgerReason: string | null; baselinePlaces: number; baselineOccurrences: number; memoryPublic: boolean; dataHubConfigured?: boolean };
  close(): void;
};

/** Controlled Node 24 startup only. Does not read .env files, fetch, call AI, or
 * auto-enable memory for guests. Root owns the isolated persistent volume.
 */
export function initializeVpsRuntime(options: {
  env?: Record<string, string | undefined>;
  now?: () => number;
  loadEvents?: () => Promise<SxodimSnapshot>;
} = {}): VpsRuntime {
  if (getHostedRuntime()) throw new Error("HOST_RUNTIME_ALREADY_INITIALIZED");
  const env = options.env ?? process.env;
  const db = openDatastore({ path: env.QETTYQ_DATABASE_PATH, production: env.NODE_ENV === "production", migrate: true });
  try {
    atomic(db, () => db.exec(DATA_HUB_SCHEMA_V1));
    const store = createEventsStore(db);
    const osm = sourceRegistry.find(source => source.id === "osm-overpass-poi");
    const sxodim = sourceCandidates.sources.find(source => source.id === "sxodim-astana");
    if (!osm || osm.status !== "approved_for_scope" || !osm.allowed_uses.persist || !osm.allowed_uses.display
      || !sxodim || sxodim.status !== "approved_for_scope" || !sxodim.fetchApproved || typeof sxodim.termsUrl !== "string") throw new Error("BASELINE_SOURCE_POLICY_REVIEW_REQUIRED");
    store.registerSource({ id: osm.id, name: osm.name, policyUrl: osm.terms_url, allowPersist: osm.allowed_uses.persist,
      allowDisplay: osm.allowed_uses.display, allowLlm: osm.allowed_uses.send_to_llm, allowFetch: false,
      credit: osm.attribution_template, minimumRefreshMinutes: 1440 });
    store.registerSource({ id: "sxodim-astana-noncommercial", name: sxodim.name, policyUrl: sxodim.termsUrl,
      allowPersist: true, allowDisplay: true,
      // Existing approved public RAG is short normalized event facts, never descriptions/photos.
      // This does not expand the existing noncommercial pilot or authorize new media use.
      allowLlm: true, allowFetch: true, credit: "Давай Сходим", minimumRefreshMinutes: 60 });
    const snapshot = baselineEvents as SxodimSnapshot;
    store.importSxodim(snapshot);
    // Technical retention for a dated POI snapshot, not a claim of live business hours.
    const poiExpiry = new Date(Math.max(...baselinePlaces.map(place => Date.parse(place.retrievedAt))) + 30 * 86_400_000).toISOString();
    store.importPlaces(baselinePlaces as Place[], { sourceId: osm.id, expiresAt: poiExpiry });

    let ledgerReady = false, ledgerReason: string | null = null;
    try {
      const proof = readVerifiedLedgerProof(env.QETTYQ_D1_LEDGER_EXPORT_PATH);
      importD1Ledger(db, proof.rows, proof);
      ledgerReady = true;
    } catch {
      // Never log file content/provider errors. Missing/invalid proof cannot authorize billing.
      ledgerReason = env.QETTYQ_D1_LEDGER_EXPORT_PATH ? "PUBLIC_LEDGER_EXPORT_INVALID" : "PUBLIC_LEDGER_EXPORT_PATH_REQUIRED";
    }
    const ai = createPublicAIRuntime({ ...env, DB: ledgerReady ? sqlitePublicAIDatabase(db) : undefined });
    const events = createLiveEventsService({ now: options.now, cache: store.snapshotCache, fallback: snapshot,
      load: async () => {
        if (!store.acquireSourceRefresh("sxodim-astana-noncommercial", options.now?.() ?? Date.now())) throw new Error("SOURCE_REFRESH_COOLDOWN");
        return (options.loadEvents ?? fetchLiveAstanaEvents)();
      },
    });
    const routingDb = sqliteRoutingDatabase(db);
    const routingEnv: Record<string, string | undefined> = {};
    for (const key of ["NODE_ENV", "QETTYQ_PUBLIC_ROUTING_ENABLED", "QETTYQ_ROUTING_PROVIDER", "QETTYQ_VALHALLA_PUBLIC_USAGE_ACK", "OPENROUTESERVICE_API_KEY"]) routingEnv[key] = env[key];
    const hubRepository = createDataHubRepository(db, options.now);
    hubRepository.purgeExpired();
    let dataHub: HostedRuntime["dataHub"];
    const hubTokenHash = env.QETTYQ_HUB_THREADS_TOKEN_SHA256?.trim();
    if (hubTokenHash && /^[a-f0-9]{64}$/u.test(hubTokenHash)) {
      hubRepository.registerProducer({ id: "threads-analyzer", tokenHash: hubTokenHash, sourceIds: ["threads-candidate"],
        sourceHosts: { "threads-candidate": ["threads.com", "www.threads.com", "threads.net", "www.threads.net"] },
        cities: ["astana", "almaty"], enabled: true });
      dataHub = { ...createDataHubService(hubRepository), getFeed: createPublicDataHubFeed(hubRepository, options.now).get };
    } else {
      db.prepare("UPDATE qettyq_hub_producers SET enabled=0 WHERE id='threads-analyzer'").run();
    }
    const memory = createMemoryService(db, { production: env.NODE_ENV === "production", now: options.now });
    const hubCleanup = setInterval(() => { try { hubRepository.purgeExpired(); } catch { /* never log payload/SQL parameters */ } }, 60_000);
    hubCleanup.unref();
    let closed = false;
    const mergedEvents = dataHub ? createHubEventsBridge({ baseGet: events.get, hubGet: () => dataHub.getFeed({ cityId: "astana" }), now: options.now }) : events;
    const matchAddress = createAddressMatcher(addressIndex as AddressIndex, options.now ?? Date.now);
    const matchVenue = createEventVenueMatcher(baselinePlaces, matchAddress, options.now ?? Date.now);
    const runtime: VpsRuntime = {
      ai, dataHub, events: { async get() {
        const result = await mergedEvents.get();
        // Independent derived OSM evidence; raw publisher snapshot stays unchanged.
        return { ...result, items: enrichEventAddresses(result.items, matchAddress, matchVenue) };
      }, canSendToLlm(sourceId) {
        try { return Boolean(db.prepare("SELECT 1 FROM data_sources WHERE id=? AND allow_persist=1 AND allow_display=1 AND allow_llm=1").get(sourceId)); }
        catch { return false; }
      } }, memory,
      routing: { reserve: sessionId => reserveRoutingRequest(routingDb, sessionId, options.now?.() ?? Date.now()), env: routingEnv },
      diagnostics: { ledgerReady, ledgerReason, baselinePlaces: baselinePlaces.length, baselineOccurrences: snapshot.items.length, memoryPublic: true, dataHubConfigured: Boolean(dataHub) },
      close() { if (closed) return; closed = true; if (getHostedRuntime() === runtime) setHostedRuntime(null); clearInterval(hubCleanup); runtime.memory?.dispose?.(); db.close(); },
    };
    setHostedRuntime(runtime);
    return runtime;
  } catch (error) { db.close(); throw error; }
}
