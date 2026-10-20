import type { LiveEventsResult } from "../ingestion/live-events";
import type { PublicAIRuntime } from "./public-ai-runtime";

/** Node-free dependency bridge. Server code only; never serialize this object.
 * Worker entrypoints may continue injecting their own bindings explicitly.
 * Durable client memory is deliberately absent until consent/auth APIs exist.
 */
export type HostedRuntime = {
  ai: PublicAIRuntime;
  events: { get(): Promise<LiveEventsResult> };
  routing: { reserve(sessionId: string): Promise<boolean>; env?: Record<string, string | undefined> };
};
const runtimeKey = Symbol.for("qettyq.host-runtime.v1");
const registry = () => globalThis as typeof globalThis & { [key: symbol]: unknown };

export function getHostedRuntime(): HostedRuntime | undefined {
  return registry()[runtimeKey] as HostedRuntime | undefined;
}
export function setHostedRuntime(runtime: HostedRuntime | null): void {
  if (runtime === null) delete registry()[runtimeKey];
  else registry()[runtimeKey] = runtime;
}
