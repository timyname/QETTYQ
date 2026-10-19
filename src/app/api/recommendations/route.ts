import { NextResponse } from "next/server";
import { z } from "zod";
import places from "../../../../data/places.json";
import { recommend } from "@/domain/recommend";
import type { Place } from "@/domain/types";
import { createLLMProvider, DeterministicProvider } from "@/server/providers/llm";

const schema = z.object({
  goal: z.enum(["food", "walk", "activity", "new"]),
  minutes: z.number().int().min(20).max(360),
  budget: z.number().int().min(0).max(1_000_000).nullable(),
  origin: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
  likedTags: z.array(z.string()).max(30).default([]),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "VALIDATION_ERROR", issues: parsed.error.issues }, { status: 400 });
  }
  const items = recommend(places as Place[], parsed.data);
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
  return NextResponse.json({
    requestId: crypto.randomUUID(),
    dataMode: "snapshot",
    generationMode: explanations.mode,
    generatedAt: new Date().toISOString(),
    warnings: ["Маршрут рассчитан приблизительно: внешний routing-provider не подключён.", ...(explanations.warning ? [explanations.warning] : [])],
    items: selected.map((item) => ({ ...item, reason: explanationById.get(item.id)?.reason ?? item.reason })),
  });
}
