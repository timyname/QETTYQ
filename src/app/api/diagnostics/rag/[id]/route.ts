import { getHostedRuntime } from '../../../../../server/pilot/host-runtime';
import { jsonResponse, requireSession } from '../../../../../server/session/http';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!/^[a-f0-9-]{36}$/u.test(id)) return jsonResponse({ error: { code: 'NOT_FOUND' } }, 404);
  try {
    const trace = getHostedRuntime()?.ragTraces?.read(auth.session.id, id);
    return trace ? jsonResponse({ trace }) : jsonResponse({ error: { code: 'NOT_FOUND' } }, 404);
  } catch { return jsonResponse({ error: { code: 'NOT_FOUND' } }, 404); }
}
