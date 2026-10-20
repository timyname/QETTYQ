import { getSmartAssistantAvailability, type SmartAssistantEnvironment } from "./smart-assistant";

type QuotaOptions = { env?: SmartAssistantEnvironment; directory?: string };
const RESERVATION = "ai-test-reservation-v1.json";

/** A Host check is an extra local-development restriction, not user authentication. */
export function getLocalAITestGate(request: Request, env: SmartAssistantEnvironment = process.env) {
  const base = getSmartAssistantAvailability(env);
  if (!base.configured) return { ...base, allowed: false, reason: base.reason };
  if (env.NODE_ENV !== "development") return { ...base, allowed: false, reason: "LOCAL_TEST_REQUIRES_DEVELOPMENT" };
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host") ?? requestUrl.host;
    if (/[\s\\/@?#]/u.test(host)) throw new Error("invalid authority");
    const url = new URL(`${requestUrl.protocol}//${host}`);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return { ...base, allowed: false, reason: "LOCAL_TEST_HOST_REQUIRED" };
    return { ...base, allowed: true, reason: null };
  } catch { return { ...base, allowed: false, reason: "LOCAL_TEST_HOST_REQUIRED" }; }
}

export async function getAITestStatus(request: Request, options: QuotaOptions = {}) {
  const gate = getLocalAITestGate(request, options.env);
  const base = { configured: gate.configured, model: gate.model, localTestOnly: true as const };
  // No Node imports or filesystem access on the public/disabled/missing-key path.
  if (!gate.allowed) return { ...base, available: false, reason: gate.reason, remainingTestCalls: 0 as const };
  try {
    const fs = await import("node:fs/promises");
    const directory = options.directory ?? `${process.cwd()}/.sites-runtime`;
    try {
      await fs.lstat(`${directory}/${RESERVATION}`);
      return { ...base, available: false, reason: "TEST_QUOTA_EXHAUSTED", remainingTestCalls: 0 as const };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return { ...base, available: true, reason: null, remainingTestCalls: 1 as const };
    }
  } catch { return { ...base, available: false, reason: "QUOTA_UNAVAILABLE", remainingTestCalls: 0 as const }; }
}

/** One durable TEST reservation for the full approved $2 envelope, NOT a price guarantee.
 * The file is never removed/refunded on failure or restart. Further tests need new owner approval.
 * No volatile fallback, no paid call here, no secret or personal data written.
 */
export async function reserveLocalAITestCall(request: Request, options: QuotaOptions = {}): Promise<boolean> {
  if (!getLocalAITestGate(request, options.env).allowed) return false;
  try {
    const fs = await import("node:fs/promises");
    const directory = options.directory ?? `${process.cwd()}/.sites-runtime`;
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const file = await fs.open(`${directory}/${RESERVATION}`, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify({ version: 1, reservedAt: new Date().toISOString(), reservedBudgetUsd: 2, permittedCalls: 1, refundable: false, note: "Owner-approved TEST envelope reserved in full. Not a guarantee of provider billing." }));
      await file.sync();
    } finally { await file.close(); }
    return true;
  } catch { return false; }
}
