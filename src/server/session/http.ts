import { z } from "zod";
import { idempotencyKeySchema, sessionTokenSchema } from "./schemas";
import { getSession, type SessionRecord } from "./store";

export const SESSION_COOKIE = "qettyq_session";
export const SESSION_HEADER = "x-qettyq-session";
export const MAX_JSON_BYTES = 16 * 1024;

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "SESSION_REQUIRED"
  | "SESSION_CONFLICT"
  | "SESSION_CAPACITY_REACHED"
  | "RATE_LIMITED"
  | "IDEMPOTENCY_KEY_REQUIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "NOTHING_TO_UNDO"
  | "CROSS_SITE_REQUEST_BLOCKED";

type ResponseMeta = {
  requestId: string;
  dataMode: "live";
  storageMode: "in_memory_ephemeral";
  generatedAt: string;
  warnings: string[];
};

export function responseMeta(requestId = crypto.randomUUID()): ResponseMeta {
  return {
    requestId,
    dataMode: "live",
    storageMode: "in_memory_ephemeral",
    generatedAt: new Date().toISOString(),
    warnings: ["Данные гостевой сессии хранятся только в памяти этого процесса."],
  };
}

export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("cache-control", "no-store, max-age=0");
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export function apiError(code: ApiErrorCode, status: number, issues?: unknown) {
  return jsonResponse({ ...responseMeta(), error: { code, issues: issues ?? null } }, status);
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return rawValue.join("=") || null;
  }
  return null;
}

export function sessionTokenFromRequest(request: Request) {
  const cookieToken = cookieValue(request, SESSION_COOKIE);
  const headerToken = request.headers.get(SESSION_HEADER);
  if (cookieToken && headerToken && cookieToken !== headerToken) {
    return { ok: false as const, code: "SESSION_CONFLICT" as const };
  }
  const parsed = sessionTokenSchema.safeParse(headerToken ?? cookieToken);
  if (!parsed.success) return { ok: false as const, code: "SESSION_REQUIRED" as const };
  return { ok: true as const, token: parsed.data };
}

export function requireSession(request: Request):
  | { ok: true; session: SessionRecord }
  | { ok: false; response: Response } {
  const token = sessionTokenFromRequest(request);
  if (!token.ok) {
    return {
      ok: false,
      response: apiError(token.code, token.code === "SESSION_CONFLICT" ? 400 : 401),
    };
  }
  const session = getSession(token.token);
  if (!session) {
    return { ok: false, response: apiError("SESSION_REQUIRED", 401) };
  }
  return { ok: true, session };
}

export function requireIdempotencyKey(request: Request):
  | { ok: true; key: string }
  | { ok: false; response: Response } {
  const key = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!key.success) {
    return {
      ok: false,
      response: apiError("IDEMPOTENCY_KEY_REQUIRED", 400, key.error.issues),
    };
  }
  return { ok: true, key: key.data };
}

export async function readJson(request: Request): Promise<
  | { ok: true; value: unknown }
  | { ok: false; response: Response }
> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    return { ok: false, response: apiError("PAYLOAD_TOO_LARGE", 413) };
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_JSON_BYTES) {
    return { ok: false, response: apiError("PAYLOAD_TOO_LARGE", 413) };
  }
  try {
    return { ok: true, value: body.length === 0 ? {} : JSON.parse(body) };
  } catch {
    return { ok: false, response: apiError("VALIDATION_ERROR", 400) };
  }
}

export function validationError(error: z.ZodError) {
  return apiError("VALIDATION_ERROR", 400, error.issues);
}

export function blockCrossSiteMutation(request: Request): Response | null {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return apiError("CROSS_SITE_REQUEST_BLOCKED", 403);
  }
  const origin = request.headers.get("origin");
  if (!origin) return null;
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    // Next may normalize Request.url to localhost while the browser connected to
    // 127.0.0.1. Trust only the actual HTTP Host authority, never forwarded hosts.
    if (host && /[\s\\/@?#]/u.test(host)) return apiError("CROSS_SITE_REQUEST_BLOCKED", 403);
    const expectedOrigin = host ? new URL(`${requestUrl.protocol}//${host}`).origin : requestUrl.origin;
    if (new URL(origin).origin !== expectedOrigin) {
      return apiError("CROSS_SITE_REQUEST_BLOCKED", 403);
    }
  } catch {
    return apiError("CROSS_SITE_REQUEST_BLOCKED", 403);
  }
  return null;
}
