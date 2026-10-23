import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import registry from '../../../data/publisher-place-media.json';
import { resolvePublisherPlaceMedia, type PublisherPlaceRecord } from './publisher-place-media';
export async function readPublisherPlaceImage(id: string, now = Date.now()): Promise<{ bytes: Buffer; mime: 'image/jpeg'; etag: string } | null> {
  if (!/^[a-f0-9]{64}$/u.test(id)) return null;
  const record = registry.records.find(p => (p as PublisherPlaceRecord).sha256 === id) as PublisherPlaceRecord | undefined;
  if (!record || !resolvePublisherPlaceMedia(record.placeId, registry, now)) return null;
  try {
    const bytes = await readFile(path.join(process.cwd(), 'data/place-media-cache', `${id}.jpg`));
    if (bytes.length !== record.bytes || createHash('sha256').update(bytes).digest('hex') !== id) return null;
    return { bytes, mime: 'image/jpeg', etag: `"${id}"` };
  } catch { return null; }
}
