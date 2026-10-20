import { DeterministicProvider } from "./deterministic";
import type { LLMProvider } from "./types";

export function createLLMProvider(): LLMProvider {
  // Legacy recommendations have no per-request consent or durable TEST reservation.
  // A configured key must NEVER implicitly enable billing here. The sole permitted
  // paid path is the explicitly opted-in, bounded local smart-assistant chat adapter.
  return new DeterministicProvider();
}

export { DeterministicProvider } from "./deterministic";
export type { ExplainResult, EvidenceItem, Explanation, LLMProvider } from "./types";
