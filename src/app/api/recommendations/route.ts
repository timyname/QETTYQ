import places from "../../../../data/places.json";
import { recommend } from "@/domain/recommend";
import type { Place } from "@/domain/types";
import { createLLMProvider, DeterministicProvider } from "@/server/providers/llm";
import { pilotContextSchema } from "@/server/pilot/contracts";
import { apiError, blockCrossSiteMutation, jsonResponse, readJson } from "@/server/session/http";

export async function POST(request: Request) {
  const blocked = blockCrossSiteMutation(request);
  if (blocked) return blocked;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = pilotContextSchema.safeParse(body.value);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", 400, parsed.error.issues);
  }
  if (!parsed.data.origin) return apiError("VALIDATION_ERROR", 400, [{ message: "Для расчёта пути нужна выбранная точка старта." }]);
  const items = recommend(places as Place[], { ...parsed.data, origin: parsed.data.origin });
  const selected = items.slice(0, 3);
  const provider = createLLMProvider();
  let explanations;
  try {
    explanations = await provider.explain(selected);
  } catch {
    explanations = await new DeterministicProvider().explain(selected);
    explanations.warning = "AI-провайдер недоступен — использован детерминированный fallback.";
  }
  const explanationById = new Map(explanations.items.map((item) => [item.candidateId, item]));
  return jsonResponse({
    requestId: crypto.randomUUID(),
    dataMode: "snapshot",
    generationMode: explanations.mode,
    generatedAt: new Date().toISOString(),
    warnings: ["Маршрут рассчитан приблизительно: внешний routing-provider не подключён.", ...(explanations.warning ? [explanations.warning] : [])],
    items: selected.map((item) => ({ ...item, reason: explanationById.get(item.id)?.reason ?? item.reason })),
  });
}
