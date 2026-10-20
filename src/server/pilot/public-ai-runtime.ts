import { getSmartAssistantAvailability, type SmartAssistantDependencies, type SmartAssistantEnvironment } from "./smart-assistant";
import { createPublicAIQuota, getPublicAIBudgetStatus, type PublicAIDatabase } from "./public-ai-budget";

/** Root injects Cloudflare bindings. No filesystem or cloudflare-only imports in shared code. */
export type PublicAIRuntimeBindings = SmartAssistantEnvironment & { DB?: PublicAIDatabase };

export async function getPublicAIStatus(bindings: PublicAIRuntimeBindings, sessionId: string) {
  const config = getSmartAssistantAvailability(bindings, "public");
  const base = { configured: config.configured, model: config.model, localTestOnly: false, hostedWebSearch: false, retrievalMode: "source_evidence" as const };
  if (!config.configured) return { ...base, available: false, reason: config.reason, remainingCalls: 0 };
  return { ...base, ...await getPublicAIBudgetStatus(bindings.DB, sessionId) };
}

export function publicAIAdapterDependencies(bindings: PublicAIRuntimeBindings, sessionId: string, requestId: string): SmartAssistantDependencies {
  return { env: bindings, executionScope: "public", quota: createPublicAIQuota({ db: bindings.DB, sessionId, requestId }) };
}

export function createPublicAIRuntime(bindings: PublicAIRuntimeBindings) {
  return {
    getStatus: (sessionId: string) => getPublicAIStatus(bindings, sessionId),
    dependencies: (sessionId: string, requestId: string) => publicAIAdapterDependencies(bindings, sessionId, requestId),
  };
}
export type PublicAIRuntime = ReturnType<typeof createPublicAIRuntime>;
