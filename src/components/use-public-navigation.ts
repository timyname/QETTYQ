'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parsePublicRoute, publicRouteHash, type PublicRoute } from '../client/public-navigation';

/** URL contains public screens/IDs only; all personal state stays in the app.
 * `false` means a known route is waiting for the existing catalogue/feed load. */
export function usePublicNavigation({ ready, route, applyRoute }: {
  ready: boolean;
  route: PublicRoute | null;
  applyRoute: (route: PublicRoute | null) => PublicRoute | false;
}) {
  const [requested, setRequested] = useState<{ hash: string; revision: number } | null>(null);
  const revision = useRef(0);
  const pending = useRef(true);
  const expected = useRef<string | null>(null);
  const attached = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const read = () => { pending.current = true; setRequested({ hash: window.location.hash, revision: ++revision.current }); };
    window.addEventListener('popstate', read);
    window.addEventListener('hashchange', read);
    queueMicrotask(() => { if (!cancelled) read(); });
    return () => { cancelled = true; window.removeEventListener('popstate', read); window.removeEventListener('hashchange', read); };
  }, []);

  useEffect(() => {
    if (!ready || !requested) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || requested.revision !== revision.current) return;
      // Empty initial URL keeps the existing onboarding/local restoration flow.
      const applied = requested.hash ? applyRoute(parsePublicRoute(requested.hash)) : null;
      if (applied === false) return;
      expected.current = applied ? publicRouteHash(applied) : null;
      pending.current = false;
      setRequested(null);
    });
    return () => { cancelled = true; };
  }, [ready, requested, applyRoute]);

  useEffect(() => {
    if (!ready || pending.current || requested || !route) return;
    const hash = publicRouteHash(route);
    if (expected.current && expected.current !== hash) return;
    const restoring = expected.current !== null;
    expected.current = null;
    // Drop query parameters rather than copying any private input into history.
    if (window.location.hash !== hash || window.location.search) {
      const url = `${window.location.pathname}${hash}`;
      if (!attached.current || restoring) window.history.replaceState(null, '', url);
      else window.history.pushState(null, '', url);
    }
    attached.current = true;
  }, [ready, route, requested]);

  return useCallback(() => {
    // An explicit UI choice wins over a still-loading initial event link.
    ++revision.current;
    pending.current = false;
    expected.current = null;
    setRequested(null);
  }, []);
}
