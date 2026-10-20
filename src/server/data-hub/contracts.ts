import { z } from "zod";

export const DATA_HUB_MAX_BYTES = 256 * 1024;
export const DATA_HUB_MAX_RECORDS = 50;
export const hubId = z.string().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9_.:@/-]*$/u);
export const sourceId = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/u);
const plain = (max: number) => z.string().trim().min(1).max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]|<\/?[a-z!]/iu.test(value), "Plain text required");
export const publicUrl = z.string().max(2048).refine(value => {
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password && !url.port && host.includes(".")
      && !host.endsWith(".local") && !host.endsWith(".localhost") && !host.endsWith(".internal")
      && !/^\d+(?:\.\d+)*$/u.test(host) && !host.includes(":");
  } catch { return false; }
}, "Public HTTPS metadata URL required");
export const timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u)
  .refine(value => Number.isFinite(Date.parse(value)) && value.slice(0, 10) === new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10), "Explicit valid ISO timestamp required");
const city = z.enum(["astana", "almaty"]);
export const provenanceSchema = z.object({
  field: z.string().min(1).max(64).regex(/^[a-zA-Z][a-zA-Z0-9]*$/u),
  quality: z.enum(["observed", "derived", "estimated", "unknown", "conflicting"]),
  method: z.enum(["source", "algorithm", "llm"]), methodId: plain(100).nullable().default(null),
  sourceUrl: publicUrl, fetchedAt: timestamp, expiresAt: timestamp,
}).strict();
const coordinates = z.object({ lat: z.number().finite().min(-90).max(90), lon: z.number().finite().min(-180).max(180),
  quality: z.enum(["observed", "derived"]), sourceUrl: publicUrl, methodId: plain(100).nullable() }).strict();
const mediaSchema = z.object({ externalId: hubId, url: publicUrl, sourceUrl: publicUrl,
  type: z.enum(["real_place_photo", "real_event_photo", "category_illustration"]),
  author: plain(200).nullable(), license: plain(120).nullable(), evidenceUrl: publicUrl.nullable(),
}).strict();
const base = z.object({ sourceId, externalId: hubId, revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  sourceUrl: publicUrl, fetchedAt: timestamp, expiresAt: timestamp, dataMode: z.enum(["live", "snapshot"]),
  provenance: z.array(provenanceSchema).max(32), media: z.array(mediaSchema).max(8).default([]) }).strict();
const nullableText = (max: number) => plain(max).nullable();
const place = base.extend({ kind: z.literal("place"), facts: z.object({ cityId: city, name: plain(300), category: nullableText(100),
  address: nullableText(500), coordinates: coordinates.nullable(), openingHours: nullableText(500),
  tags: z.array(plain(48)).max(30) }).strict() });
const event = base.extend({ kind: z.literal("event"), facts: z.object({ cityId: city, name: plain(300), category: nullableText(100),
  venueExternalId: hubId.nullable(), organizerUrl: publicUrl.nullable(), bookingUrl: publicUrl.nullable(),
  description: nullableText(2000) }).strict() });
const occurrence = base.extend({ kind: z.literal("occurrence"), facts: z.object({ cityId: city, eventExternalId: hubId,
  venueExternalId: hubId.nullable(), startsAt: timestamp.nullable(), endsAt: timestamp.nullable(), timeZone: z.literal("Asia/Almaty"),
  status: z.enum(["unknown", "scheduled", "cancelled", "postponed", "rescheduled"]),
  languages: z.array(z.enum(["ru", "kk", "en", "und"])).min(1).max(3),
  availability: z.enum(["unknown", "available", "sold_out"]) }).strict() });
const offer = base.extend({ kind: z.literal("offer"), facts: z.object({ cityId: city,
  appliesTo: z.object({ kind: z.enum(["place", "event", "occurrence"]), externalId: hubId }).strict(),
  priceKind: z.enum(["unknown", "exact", "from", "range"]), minMinor: z.number().int().min(0).max(1_000_000_000).nullable(),
  maxMinor: z.number().int().min(0).max(1_000_000_000).nullable(), currency: z.literal("KZT").nullable(),
  basis: z.enum(["person", "group", "unknown"]), validFrom: timestamp.nullable(), validUntil: timestamp.nullable(),
  availability: z.enum(["unknown", "available", "sold_out"]), bookingUrl: publicUrl.nullable() }).strict() });
export const hubRecordSchema = z.discriminatedUnion("kind", [place, event, occurrence, offer]);
export type HubRecord = z.infer<typeof hubRecordSchema>;
export type HubKind = HubRecord["kind"];
export const hubBatchSchema = z.object({ schemaVersion: z.literal(1), batchId: hubId,
  records: z.array(z.unknown()).min(1).max(DATA_HUB_MAX_RECORDS) }).strict();
export type HubRecordResult = { recordId: string; externalId: string | null; revision: number | null; kind: HubKind | null;
  status: "accepted" | "quarantined" | "duplicate"; reasons: string[] };
export type HubBatchResult = { schemaVersion: 1; batchId: string; replay: boolean; accepted: number; quarantined: number; duplicate: number;
  records: HubRecordResult[] };
export type HubProducer = { id: string; tokenHash: string; sourceIds: string[]; cities: ("astana" | "almaty")[];
  sourceHosts: Record<string, string[]>; enabled: boolean; maxBatchesPerMinute?: number; maxRecordsPerDay?: number; maxBytesPerDay?: number };
