import { DATA_HUB_MAX_BYTES, hubBatchSchema } from "./contracts";
import type { DataHubRepository } from "./repository";

const json = (value: unknown, status: number) => Response.json(value, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
const error = (code: string, status: number) => json({ error: { code } }, status);
async function readBody(request: Request) {
  if (!request.body) throw new Error("HUB_JSON_INVALID");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/u.test(declared) || Number(declared) > DATA_HUB_MAX_BYTES)) throw new Error("HUB_PAYLOAD_TOO_LARGE");
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read(); if (next.done) break;
      length += next.value.byteLength;
      if (length > DATA_HUB_MAX_BYTES) { await reader.cancel(); throw new Error("HUB_PAYLOAD_TOO_LARGE"); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new Error("HUB_JSON_INVALID"); }
}

/** Root mounts this on a dedicated internal M2M route. Never uses user cookies,
 * publishes source policy, fetches an incoming URL or calls an LLM. */
export function createDataHubService(repository: DataHubRepository) {
  return { async handle(request: Request): Promise<Response> {
    if (request.method !== "POST") return error("METHOD_NOT_ALLOWED", 405);
    // This is not a browser/CORS endpoint. No cookie-session substitution.
    if (request.headers.has("origin") || request.headers.get("sec-fetch-site") === "cross-site") return error("HUB_MACHINE_ONLY", 403);
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer [A-Za-z0-9_-]{32,256}$/u.test(authorization)) return error("HUB_UNAUTHORIZED", 401);
    try {
      const producer = repository.authenticate(authorization.slice(7));
      if (!producer) return error("HUB_UNAUTHORIZED", 401);
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return error("HUB_JSON_REQUIRED", 415);
      const parsed = hubBatchSchema.safeParse(await readBody(request));
      if (!parsed.success) return error("HUB_BATCH_INVALID", 400);
      repository.purgeExpired();
      const result = repository.ingest(producer, parsed.data.batchId, parsed.data.records);
      return json(result, result.replay ? 200 : 202);
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : "";
      const statuses: Record<string, number> = { HUB_JSON_INVALID: 400, HUB_UNAUTHORIZED: 401, HUB_SOURCE_SCOPE_DENIED: 403,
        HUB_BATCH_CONFLICT: 409, HUB_PAYLOAD_TOO_LARGE: 413, HUB_RATE_LIMITED: 429, HUB_CAPACITY_REACHED: 503 };
      return error(code in statuses ? code : "HUB_STORAGE_UNAVAILABLE", statuses[code] ?? 503);
    }
  } };
}
