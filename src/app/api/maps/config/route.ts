import { browserMapConfig } from '../../../../server/pilot/browser-map-config';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(browserMapConfig(process.env), { headers: {
    'cache-control': 'private, no-store, max-age=0',
    'cdn-cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  } });
}
