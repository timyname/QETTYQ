import places from "../data/places.json";
import { z } from "zod";

const place = z.object({
  id: z.string().startsWith("osm:"), name: z.string().min(1), category: z.string().min(1),
  lat: z.number().min(50).max(53), lon: z.number().min(69).max(74), sourceUrl: z.string().url(),
  sourceName: z.string().min(1), retrievedAt: z.string().datetime(), dataMode: z.literal("snapshot"),
});
const parsed = z.array(place).min(1).safeParse(places);
if (!parsed.success) { console.error(parsed.error.issues); process.exit(1); }
const ids = new Set(places.map((item) => item.id));
if (ids.size !== places.length) throw new Error("Duplicate source IDs detected");
console.log(`Validated ${places.length} snapshot POI records with provenance.`);
