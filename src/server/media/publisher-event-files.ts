import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import registry from '../../../data/publisher-event-media.json';
import { resolvePublisherEventMedia, type PublisherPosterRecord } from './publisher-event-media';

/** Node-only runtime gate, deliberately separate from the worker-compatible parser.
 * Expired/revoked files are never exposed via a forever-public static URL.
 */
export async function readPublisherEventImage(id: string, now = Date.now()): Promise<{ bytes: Buffer; mime: 'image/jpeg'; etag: string } | null> {
  if (!/^[a-f0-9]{64}$/u.test(id)) return null;
  const record = registry.records.find(item => (item as PublisherPosterRecord).sha256 === id) as PublisherPosterRecord | undefined;
  if (!record || !resolvePublisherEventMedia(record.eventSourceUrl, registry, now)) return null;
  try {
    const bytes = await readFile(path.join(process.cwd(), 'data/event-media-cache', `${id}.jpg`));
    if (bytes.length !== record.bytes || createHash('sha256').update(bytes).digest('hex') !== id) return null;
    return { bytes, mime: 'image/jpeg', etag: `"${id}"` };
  } catch { return null; }
}
