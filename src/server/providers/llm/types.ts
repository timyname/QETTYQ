import type { Recommendation } from "@/domain/types";

export type EvidenceItem = Pick<
  Recommendation,
  "id" | "name" | "category" | "totalMinutes" | "feasibility" | "unknowns" | "sourceUrl"
>;

export type Explanation = {
  candidateId: string;
  reason: string;
  evidenceIds: string[];
  unknowns: string[];
};

export type ExplainResult = {
  mode: "llm" | "deterministic";
  items: Explanation[];
  warning?: string;
};

export interface LLMProvider {
  explain(items: EvidenceItem[]): Promise<ExplainResult>;
}
