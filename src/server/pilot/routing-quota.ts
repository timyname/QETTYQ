import type { PublicAIDatabase } from './public-ai-budget';

// Shared D1 limiter for the single dedicated FOSSGIS walking service.
// No coordinates, session identifiers, or route responses are stored here.
export const ROUTING_RESERVATION_SQL = `
INSERT INTO qettyq_routing_throttle (id, requested_at_ms, utc_day, daily_count)
VALUES ('fossgis-foot-v1', ?, ?, 1)
ON CONFLICT(id) DO UPDATE SET
  requested_at_ms = excluded.requested_at_ms,
  utc_day = excluded.utc_day,
  daily_count = CASE WHEN utc_day = excluded.utc_day THEN daily_count + 1 ELSE 1 END
WHERE requested_at_ms <= excluded.requested_at_ms - 1500
  AND (utc_day <> excluded.utc_day OR daily_count < 200)
`;

export async function reserveRoutingRequest(db: PublicAIDatabase | undefined, sessionId: string, now = Date.now()): Promise<boolean> {
  if (!db || !sessionId || !Number.isSafeInteger(now) || now < 0) return false;
  try {
    const result = await db.prepare(ROUTING_RESERVATION_SQL).bind(now, new Date(now).toISOString().slice(0, 10)).run();
    return result.success === true && result.meta?.changes === 1;
  } catch { return false; }
}
