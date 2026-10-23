/** Public screens/IDs only. Never encode coordinates, plan stops or chat text. */
export type PublicScreen = 'welcome' | 'swipe' | 'conditions' | 'feed' | 'chat' | 'map' | 'profile' | 'saved' | 'settings';
export type PublicRoute = { screen: PublicScreen } | { screen: 'detail' | 'event'; id: string };
const screens = new Set<PublicScreen>(['welcome', 'swipe', 'conditions', 'feed', 'chat', 'map', 'profile', 'saved', 'settings']);
const publicId = (value: string) => /^[a-zA-Z0-9:._+-]{1,256}$/u.test(value);
export function parsePublicRoute(hash: string): PublicRoute | null {
  if (hash.length > 1024) return null;
  const match = /^#\/([a-z]+)(?:\/([^/?#]+))?$/u.exec(hash);
  if (!match) return null;
  if (screens.has(match[1] as PublicScreen) && !match[2]) return { screen: match[1] as PublicScreen };
  if (!['place', 'event'].includes(match[1]) || !match[2]) return null;
  try { const id = decodeURIComponent(match[2]); return publicId(id) ? { screen: match[1] === 'place' ? 'detail' : 'event', id } : null; }
  catch { return null; }
}
export function publicRouteHash(route: PublicRoute): string {
  if ('id' in route) return publicId(route.id) ? `#/${route.screen === 'detail' ? 'place' : 'event'}/${encodeURIComponent(route.id)}` : '#/feed';
  return screens.has(route.screen) ? `#/${route.screen}` : '#/feed';
}
export function screenPublicRoute(screen: string, placeId?: string, eventId?: string): PublicRoute | null {
  if (screen === 'detail' && placeId && publicId(placeId)) return { screen, id: placeId };
  if (screen === 'event' && eventId && publicId(eventId)) return { screen, id: eventId };
  return screens.has(screen as PublicScreen) ? { screen: screen as PublicScreen } : null;
}
