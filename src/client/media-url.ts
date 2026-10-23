/** Bundled iOS has no HTTP server at capacitor://localhost. Only reviewed,
 * app-owned media paths may use the production origin; never rewrite arbitrary URLs. */
export function appMediaUrl(src: string, origin = typeof window === 'undefined' ? '' : window.location.href): string {
  const allowed = /^\/api\/media\/(?:events|places)\/[a-f0-9]{64}$/u.test(src)
    || /^\/assets\/places\/[a-z0-9-]+\.jpg$/u.test(src);
  if (!allowed) return src;
  try {
    const location = new URL(origin);
    if (location.protocol === 'capacitor:' && location.hostname === 'localhost') return `https://qettyqapp.anamai.kz${src}`;
  } catch { /* SSR and invalid locations retain the local reviewed URL. */ }
  return src;
}
