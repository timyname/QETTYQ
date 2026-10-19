import { beforeEach, describe, expect, it } from "vitest";
import { POST as createSession } from "../../src/app/api/session/route";
import { POST as createReaction } from "../../src/app/api/reactions/route";
import { POST as undoReaction } from "../../src/app/api/reactions/undo/route";
import { DELETE as deleteSessionData } from "../../src/app/api/session/data/route";
import {
  SESSION_COOKIE,
  SESSION_HEADER,
} from "../../src/server/session/http";
import { resetSessionStoreForTests } from "../../src/server/session/store";

const baseUrl = "http://localhost:3000";

type SessionCredentials = { token: string; cookie: string };

async function openSession(url = `${baseUrl}/api/session`): Promise<SessionCredentials> {
  const response = await createSession(new Request(url, { method: "POST" }));
  expect(response.status).toBe(201);
  const token = response.headers.get(SESSION_HEADER);
  const setCookie = response.headers.get("set-cookie");
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(setCookie).toContain(`${SESSION_COOKIE}=${token}`);
  return { token: token!, cookie: setCookie!.split(";", 1)[0] };
}

function mutationRequest(
  path: string,
  credentials: SessionCredentials,
  body: unknown,
  idempotencyKey?: string,
  extraHeaders?: HeadersInit,
) {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json");
  headers.set("cookie", credentials.cookie);
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
  return new Request(`${baseUrl}${path}`, {
    method: path.endsWith("/data") ? "DELETE" : "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("guest session API", () => {
  beforeEach(() => resetSessionStoreForTests());

  it("creates an opaque 24-hour session with hardened cookie attributes", async () => {
    const response = await createSession(
      new Request("https://qettyq.example/api/session", { method: "POST" }),
    );
    const body = await response.json();
    const token = response.headers.get(SESSION_HEADER);
    const cookie = response.headers.get("set-cookie");

    expect(response.status).toBe(201);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body).not.toHaveProperty("session.id");
    expect(Date.parse(body.session.expiresAt) - Date.parse(body.session.createdAt)).toBe(
      24 * 60 * 60 * 1_000,
    );
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Secure");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("reuses an existing valid session instead of losing its state", async () => {
    const session = await openSession();
    const response = await createSession(
      new Request(`${baseUrl}/api/session`, {
        method: "POST",
        headers: { cookie: session.cookie },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get(SESSION_HEADER)).toBe(session.token);
    expect(body.session.reused).toBe(true);
  });

  it("records a reaction once and replays the same result for a network retry", async () => {
    const session = await openSession();
    const payload = { entityId: "poi:123", action: "like", tags: ["Кофе", "музыка"] };
    const first = await createReaction(
      mutationRequest("/api/reactions", session, payload, "reaction-retry-001"),
    );
    const second = await createReaction(
      mutationRequest("/api/reactions", session, payload, "reaction-retry-001"),
    );
    const firstBody = await first.json();
    const secondBody = await second.json();

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(firstBody.reaction.sequence).toBe(1);
    expect(secondBody.reaction.id).toBe(firstBody.reaction.id);
    expect(secondBody.replayed).toBe(true);
    expect(secondBody.profile.weights).toEqual({ "кофе": 0.5, "музыка": 0.5 });
  });

  it("rejects reusing an idempotency key for a different mutation", async () => {
    const session = await openSession();
    await createReaction(
      mutationRequest(
        "/api/reactions",
        session,
        { entityId: "poi:1", action: "like", tags: ["coffee"] },
        "same-key-001",
      ),
    );
    const conflict = await createReaction(
      mutationRequest(
        "/api/reactions",
        session,
        { entityId: "poi:2", action: "like", tags: ["coffee"] },
        "same-key-001",
      ),
    );

    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({
      error: { code: "IDEMPOTENCY_CONFLICT" },
    });
  });

  it("undoes like completely and makes retrying undo idempotent", async () => {
    const session = await openSession();
    await createReaction(
      mutationRequest(
        "/api/reactions",
        session,
        { entityId: "poi:liked", action: "like", tags: ["coffee", "quiet"] },
        "like-before-undo",
      ),
    );
    const first = await undoReaction(
      mutationRequest("/api/reactions/undo", session, {}, "undo-retry-001"),
    );
    const retry = await undoReaction(
      mutationRequest("/api/reactions/undo", session, {}, "undo-retry-001"),
    );
    const firstBody = await first.json();
    const retryBody = await retry.json();

    expect(first.status).toBe(200);
    expect(firstBody.profile.weights).toEqual({});
    expect(firstBody.reaction.undoneAt).toBeTypeOf("string");
    expect(retryBody.reaction.id).toBe(firstBody.reaction.id);
    expect(retryBody.replayed).toBe(true);
  });

  it("rebuilds capped preference weights correctly when undoing", async () => {
    const session = await openSession();
    for (let index = 0; index < 6; index += 1) {
      await createReaction(
        mutationRequest(
          "/api/reactions",
          session,
          { entityId: `poi:capped-${index}`, action: "like", tags: ["coffee"] },
          `capped-like-${index}`,
        ),
      );
    }
    const undone = await undoReaction(
      mutationRequest("/api/reactions/undo", session, {}, "undo-capped-like"),
    );

    expect((await undone.json()).profile.weights).toEqual({ coffee: 5 });
  });

  it("keeps skip neutral and distinguishes explicit dislike", async () => {
    const session = await openSession();
    const skipped = await createReaction(
      mutationRequest(
        "/api/reactions",
        session,
        { entityId: "poi:skip", action: "skip", tags: ["coffee"] },
        "neutral-skip-001",
      ),
    );
    const disliked = await createReaction(
      mutationRequest(
        "/api/reactions",
        session,
        { entityId: "poi:dislike", action: "dislike", tags: ["coffee"] },
        "explicit-dislike-001",
      ),
    );

    expect((await skipped.json()).profile.weights).toEqual({});
    expect((await disliked.json()).profile.weights).toEqual({ coffee: -1 });
  });

  it("isolates sessions for cookie and opaque-header clients", async () => {
    const firstSession = await openSession();
    const secondSession = await openSession();
    await createReaction(
      mutationRequest(
        "/api/reactions",
        firstSession,
        { entityId: "poi:private", action: "like", tags: ["private-tag"] },
        "first-session-like",
      ),
    );

    const secondUndo = await undoReaction(
      new Request(`${baseUrl}/api/reactions/undo`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "second-session-undo",
          [SESSION_HEADER]: secondSession.token,
        },
        body: "{}",
      }),
    );
    const conflictingCredentials = await undoReaction(
      new Request(`${baseUrl}/api/reactions/undo`, {
        method: "POST",
        headers: {
          cookie: firstSession.cookie,
          "content-type": "application/json",
          "idempotency-key": "credential-conflict",
          [SESSION_HEADER]: secondSession.token,
        },
        body: "{}",
      }),
    );

    expect(secondUndo.status).toBe(409);
    await expect(secondUndo.json()).resolves.toMatchObject({ error: { code: "NOTHING_TO_UNDO" } });
    expect(conflictingCredentials.status).toBe(400);
    await expect(conflictingCredentials.json()).resolves.toMatchObject({
      error: { code: "SESSION_CONFLICT" },
    });
  });

  it("deletes only the current session data and is safe to repeat", async () => {
    const session = await openSession();
    await createReaction(
      mutationRequest(
        "/api/reactions",
        session,
        { entityId: "poi:delete", action: "like", tags: ["coffee"] },
        "delete-me-reaction",
      ),
    );
    const first = await deleteSessionData(
      mutationRequest("/api/session/data", session, {}, undefined),
    );
    const second = await deleteSessionData(
      mutationRequest("/api/session/data", session, {}, undefined),
    );

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({
      deleted: true,
      removed: { reactions: 1, preferenceTags: 1, plans: 0 },
    });
    await expect(second.json()).resolves.toMatchObject({
      deleted: true,
      removed: { reactions: 0, preferenceTags: 0, plans: 0 },
    });

    const lateRetry = await createReaction(
      mutationRequest(
        "/api/reactions",
        session,
        { entityId: "poi:delete", action: "like", tags: ["coffee"] },
        "delete-me-reaction",
      ),
    );
    expect(lateRetry.status).toBe(409);

    const freshReaction = await createReaction(
      mutationRequest(
        "/api/reactions",
        session,
        { entityId: "poi:fresh", action: "like", tags: ["walk"] },
        "fresh-after-delete",
      ),
    );
    await expect(freshReaction.json()).resolves.toMatchObject({
      reaction: { sequence: 1 },
      profile: { version: 1, weights: { walk: 1 } },
    });
  });

  it("validates auth, idempotency, body size and same-origin mutations", async () => {
    const session = await openSession();
    const noSession = await createReaction(
      new Request(`${baseUrl}/api/reactions`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "missing-session" },
        body: JSON.stringify({ entityId: "poi:1", action: "like", tags: [] }),
      }),
    );
    const noKey = await createReaction(
      mutationRequest(
        "/api/reactions",
        session,
        { entityId: "poi:1", action: "like", tags: [] },
      ),
    );
    const tooLarge = await createReaction(
      mutationRequest(
        "/api/reactions",
        session,
        { entityId: "poi:1", action: "like", tags: [] },
        "oversized-request",
        { "content-length": String(17 * 1024) },
      ),
    );
    const crossSite = await createReaction(
      mutationRequest(
        "/api/reactions",
        session,
        { entityId: "poi:1", action: "like", tags: [] },
        "cross-site-request",
        { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
      ),
    );

    expect(noSession.status).toBe(401);
    expect(noKey.status).toBe(400);
    expect(tooLarge.status).toBe(413);
    expect(crossSite.status).toBe(403);
  });
});
