import { DeterministicProvider } from "./deterministic";
import { OpenAIProvider } from "./openai";
import type { LLMProvider } from "./types";

export function createLLMProvider(): LLMProvider {
  const enabled = process.env.LLM_ENABLED === "true";
  const provider = process.env.LLM_PROVIDER;
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.LLM_MODEL;
  if (enabled && provider === "openai" && key && model) return new OpenAIProvider(key, model);
  return new DeterministicProvider();
}

export { DeterministicProvider } from "./deterministic";
export type { ExplainResult, EvidenceItem, Explanation, LLMProvider } from "./types";
