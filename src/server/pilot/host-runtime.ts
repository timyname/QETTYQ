import type { LiveEventsResult } from "../ingestion/live-events";
import type { PublicAIRuntime } from "./public-ai-runtime";
import type { MemoryService } from "../memory/contracts";

/** Node-free dependency bridge. Server code only; never serialize this object.
 * Worker entrypoints may continue injecting their own bindings explicitly.
 * Optional memory exists only with durable consent/auth service, never RAM fallback.
 */
export type HostedRuntime = {
  ai: PublicAIRuntime;
  events: { get(): Promise<LiveEventsResult>; canSendToLlm?(sourceId: string): boolean };
  routing: { reserve(sessionId: string): Promise<boolean>; env?: Record<string, string | undefined> };
  memory?: MemoryService;
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
