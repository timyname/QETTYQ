export type BrowserMapConfig = { enabled: false; provider: 'openstreetmap' }
  | { enabled: true; provider: '2gis'; browserKey: string };

/** Deliberate public credential boundary. Never fall back to a server credential.
 * Operator must first verify separate MapGL/domain restrictions and owner approval.
 */
export function browserMapConfig(env: Record<string, string | undefined>): BrowserMapConfig {
  if (env.QETTYQ_2GIS_BROWSER_KEY_APPROVED !== 'true') return { enabled: false, provider: 'openstreetmap' };
  const key = env.QETTYQ_2GIS_BROWSER_KEY?.trim();
  if (!key || !/^[a-zA-Z0-9._~-]{12,512}$/u.test(key) || key === env['2GIS_API_KEY']?.trim()) {
    return { enabled: false, provider: 'openstreetmap' };
  }
  return { enabled: true, provider: '2gis', browserKey: key };
}
