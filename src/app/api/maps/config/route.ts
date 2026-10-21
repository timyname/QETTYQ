import { browserMapConfig } from '../../../../server/pilot/browser-map-config';

export const dynamic = 'force-dynamic';

export function GET(request?: Request) {
  // Older bundled iPhone releases predate the client origin guard. Their
  // URLSession bridge identifies itself; never send a web-only key to them.
  const nativeBundle = request?.headers.get('x-qettyq-client')?.startsWith('ios-bundled-pilot-');
  return Response.json(nativeBundle && process.env.QETTYQ_2GIS_NATIVE_ORIGIN_APPROVED !== 'true' ? { enabled: false, provider: 'openstreetmap' } : browserMapConfig(process.env), { headers: {
    'cache-control': 'private, no-store, max-age=0',
    'cdn-cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  } });
}
