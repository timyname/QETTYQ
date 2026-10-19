import type { ExplainResult, EvidenceItem, LLMProvider } from "./types";

export class DeterministicProvider implements LLMProvider {
  async explain(items: EvidenceItem[]): Promise<ExplainResult> {
    return {
      mode: "deterministic",
      warning: "AI-объяснение недоступно — показаны результаты детерминированного поиска.",
      items: items.map((item) => ({
        candidateId: item.id,
        reason: item.feasibility === "feasible"
          ? `Вариант укладывается в проверенные ограничения; расчётное общее время — ${item.totalMinutes} мин.`
          : `Вариант близок к условиям, но перед выбором нужно уточнить неизвестные сведения.`,
        evidenceIds: [`candidate:${item.id}`, `source:${item.id}`],
        unknowns: item.unknowns,
      })),
    };
  }
}
