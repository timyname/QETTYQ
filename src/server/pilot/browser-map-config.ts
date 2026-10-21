import { approvedDgisStyleId } from '../../client/dgis-theme';
export type BrowserMapConfig = { enabled: false; provider: 'openstreetmap' }
  | { enabled: true; provider: '2gis'; browserKey: string; allowedOrigins: string[]; styleId?: string };

/** Never implicitly fall back to a server credential. Owner approved temporary
 * demo reuse on 2026-10-21, subject to an additional exact flag and expiry.
 */
export function browserMapConfig(env: Record<string, string | undefined>, now = Date.now()): BrowserMapConfig {
  if (env.QETTYQ_2GIS_BROWSER_KEY_APPROVED !== 'true') return { enabled: false, provider: 'openstreetmap' };
  const key = env.QETTYQ_2GIS_BROWSER_KEY?.trim();
  if (!key || !/^[a-zA-Z0-9._~-]{12,512}$/u.test(key)) {
    return { enabled: false, provider: 'openstreetmap' };
  }
  if (key === env['2GIS_API_KEY']?.trim()) {
    const expiry = Date.parse(env.QETTYQ_2GIS_DEMO_PUBLIC_UNTIL ?? '');
    if (env.QETTYQ_2GIS_REUSE_DEMO_KEY_APPROVED !== 'true' || !Number.isFinite(expiry)
      || !Number.isFinite(now) || expiry <= now || expiry - now > 31 * 86400_000) return { enabled: false, provider: 'openstreetmap' };
  }
  const styleId = approvedDgisStyleId(env.QETTYQ_2GIS_MAP_STYLE_ID);
  // Native origin requires separate owner approval and matching provider setup.
  return { enabled: true, provider: '2gis', browserKey: key,
    allowedOrigins: ['https://qettyqapp.anamai.kz', ...(env.QETTYQ_2GIS_NATIVE_ORIGIN_APPROVED === 'true' ? ['capacitor://localhost'] : [])], ...(styleId ? { styleId } : {}) };
}
