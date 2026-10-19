import { NextResponse } from "next/server";
import { z } from "zod";
import places from "../../../../data/places.json";
import { recommend } from "@/domain/recommend";
import type { Place } from "@/domain/types";

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
  return NextResponse.json({
    requestId: crypto.randomUUID(),
    dataMode: "snapshot",
    generationMode: "deterministic",
    generatedAt: new Date().toISOString(),
    warnings: ["Маршрут рассчитан приблизительно: внешний routing-provider не подключён."],
    items: items.slice(0, 3),
  });
}
