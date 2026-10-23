import { readPublisherEventImage } from '../../../../../server/media/publisher-event-files';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const asset = await readPublisherEventImage(id);
  const headers = { 'cache-control': 'no-store, max-age=0', 'x-content-type-options': 'nosniff' };
  if (!asset) return new Response(null, { status: 404, headers });
  return new Response(new Uint8Array(asset.bytes), { headers: { ...headers,
    'content-type': asset.mime, 'content-length': String(asset.bytes.length), etag: asset.etag,
    'cross-origin-resource-policy': 'cross-origin' } });
}
