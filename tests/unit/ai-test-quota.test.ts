import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAITestStatus, getLocalAITestGate, reserveLocalAITestCall } from "../../src/server/pilot/ai-test-quota";
import type { SmartAssistantEnvironment } from "../../src/server/pilot/smart-assistant";

const env: SmartAssistantEnvironment = { NODE_ENV: "development", OPENAI_API_KEY: "unit-key-not-real", QETTYQ_AI_ENABLED: "true", QETTYQ_AI_TEST_BUDGET_APPROVED: "true" };
const request = new Request("http://127.0.0.1:3000/api/chat");
let directory: string;
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), "qettyq-ai-test-")); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); vi.restoreAllMocks(); });

describe("durable one-call local AI TEST reservation (no provider calls)", () => {
  it("reserves at most one concurrent call, persists across fresh invocations, and never refunds", async () => {
    const options = { env, directory };
    expect(await getAITestStatus(request, options)).toMatchObject({ available: true, remainingTestCalls: 1 });
    const results = await Promise.all(Array.from({ length: 8 }, () => reserveLocalAITestCall(request, options)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await getAITestStatus(request, { env: { ...env }, directory })).toMatchObject({ available: false, remainingTestCalls: 0, reason: "TEST_QUOTA_EXHAUSTED" });
    expect(await reserveLocalAITestCall(request, { env: { ...env }, directory })).toBe(false);
    const record = JSON.parse(await readFile(join(directory, "ai-test-reservation-v1.json"), "utf8"));
    expect(record).toMatchObject({ version: 1, reservedBudgetUsd: 2, permittedCalls: 1, refundable: false });
    expect(JSON.stringify(record)).not.toContain(env.OPENAI_API_KEY);
  });

  it("an existing empty/corrupted reservation still consumes the call", async () => {
    await writeFile(join(directory, "ai-test-reservation-v1.json"), "");
    expect((await getAITestStatus(request, { env, directory })).remainingTestCalls).toBe(0);
    expect(await reserveLocalAITestCall(request, { env, directory })).toBe(false);
  });

  it.each([
    [{ ...env, NODE_ENV: "production" }, "PUBLIC_AI_DISABLED"],
    [{ ...env, NODE_ENV: "test" }, "LOCAL_TEST_REQUIRES_DEVELOPMENT"],
    [{ ...env, OPENAI_API_KEY: "" }, "API_KEY_MISSING"],
    [{ ...env, QETTYQ_AI_ENABLED: "false" }, "AI_DISABLED"],
  ] as const)("does not access the filesystem when the configuration gate is closed", async (config, reason) => {
    const spy = vi.spyOn(process, "cwd").mockImplementation(() => { throw new Error("Must not resolve filesystem path"); });
    expect(await getAITestStatus(request, { env: config })).toMatchObject({ available: false, remainingTestCalls: 0, reason });
    expect(await reserveLocalAITestCall(request, { env: config })).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("fails closed on unavailable filesystem, without an in-memory fallback", async () => {
    const notADirectory = join(directory, "file");
    await writeFile(notADirectory, "occupied");
    expect((await getAITestStatus(request, { env, directory: notADirectory })).reason).toBe("QUOTA_UNAVAILABLE");
    expect(await reserveLocalAITestCall(request, { env, directory: notADirectory })).toBe(false);
  });

  it("accepts actual loopback Host despite normalized URL, rejects LAN/public/forwarded authorities", () => {
    expect(getLocalAITestGate(new Request("http://localhost:3000", { headers: { host: "127.0.0.1:3000", "x-forwarded-host": "evil.example" } }), env).allowed).toBe(true);
    expect(getLocalAITestGate(new Request("http://[::1]:3000"), env).allowed).toBe(true);
    for (const host of ["192.168.1.20:3000", "example.com", "localhost@evil.example", "localhost/path"]) {
      expect(getLocalAITestGate(new Request("http://localhost:3000", { headers: { host } }), env).allowed).toBe(false);
    }
  });
});
