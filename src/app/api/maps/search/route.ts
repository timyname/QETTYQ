import { apiError, blockCrossSiteMutation, jsonResponse, readJson, requireSession } from '../../../../server/session/http';
import { searchMapSnapshot } from '../../../../server/pilot/map-search';

export async function POST(request: Request) {
  const blocked = blockCrossSiteMutation(request); if (blocked) return blocked;
  const auth = requireSession(request); if (!auth.ok) return auth.response;
  const body = await readJson(request); if (!body.ok) return body.response;
  const value = body.value;
  if (!value || typeof value !== 'object' || !('query' in value) || typeof value.query !== 'string'
    || value.query.trim().length < 2 || value.query.length > 160) return apiError('VALIDATION_ERROR', 400);
  return jsonResponse({ items: searchMapSnapshot(value.query), dataMode: 'snapshot', provider: 'osm_local', searchStored: false });
}
