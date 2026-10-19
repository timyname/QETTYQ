import { z } from "zod";
import type { ExplainResult, EvidenceItem, LLMProvider } from "./types";

const outputSchema = z.object({
  items: z.array(z.object({
    candidateId: z.string(),
    reason: z.string().min(1).max(400),
    evidenceIds: z.array(z.string()).max(8),
    unknowns: z.array(z.string()).max(8),
  })).max(3),
});

export class OpenAIProvider implements LLMProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async explain(items: EvidenceItem[]): Promise<ExplainResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          store: false,
          max_output_tokens: 700,
          input: [
            {
              role: "system",
              content: "Ты объясняешь рекомендации QETTYQ по-русски. Используй только JSON evidence. Не добавляй места, свойства, цены, часы или маршруты. Верни JSON с items: candidateId, reason, evidenceIds, unknowns.",
            },
            { role: "user", content: JSON.stringify(items) },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "qettyq_explanations",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["items"],
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["candidateId", "reason", "evidenceIds", "unknowns"],
                      properties: {
                        candidateId: { type: "string" },
                        reason: { type: "string" },
                        evidenceIds: { type: "array", items: { type: "string" } },
                        unknowns: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      });
      if (!response.ok) throw new Error(`OpenAI provider returned ${response.status}`);
      const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
      const raw = payload.output_text ?? payload.output?.flatMap((entry) => entry.content ?? []).find((part) => part.text)?.text;
      if (!raw) throw new Error("OpenAI provider returned no text");
      const parsed = outputSchema.parse(JSON.parse(raw));
      const allowedIds = new Set(items.map((item) => item.id));
      if (parsed.items.some((item) => !allowedIds.has(item.candidateId))) throw new Error("OpenAI provider returned an unknown candidate ID");
      return { mode: "llm", items: parsed.items };
    } finally {
      clearTimeout(timeout);
    }
  }
}
