import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import registry from '../../data/publisher-event-media.json';
import { GET } from '../../src/app/api/media/events/[id]/route';

describe('reviewed private publisher bytes served through a non-cacheable media gate', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-24T12:00:00Z')); });
  afterEach(() => vi.useRealTimers());
  const request = (id: string) => GET(new Request(`https://qettyq.example/api/media/events/${id}`), { params: Promise.resolve({ id }) });
  it('serves the exact reviewed JPEG and never enters the image optimizer cache', async () => {
    const record = registry.records[0];
    const response = await request(record.sha256);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.length).toBe(record.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256);
  });
  it('rejects unknown, malformed and traversal IDs without a remote fetch', async () => {
    for (const id of ['../private', '%2e%2e', 'a'.repeat(64), '']) expect((await request(id)).status).toBe(404);
  });
  it('checks rights expiry again at read time, even for an already known asset URL', async () => {
    vi.setSystemTime(new Date('2040-01-01T00:00:00Z'));
    const response = await request(registry.records[0].sha256);
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
