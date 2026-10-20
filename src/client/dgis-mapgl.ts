/** Small adapter surface from the documented MapGL v1 API, not a second map SDK. */
export type DgisAnimation = { animate?: boolean; duration?: number };
export type DgisBounds = { northEast: number[]; southWest: number[] };
export type DgisMap = {
  destroy(): void;
  on(type: 'styleload' | 'styleloaderror' | 'idle' | 'resize' | 'centerend' | 'zoomend' | 'rotationend' | 'pitchend', handler: () => void): DgisMap;
  on(type: 'click', handler: (event: { lngLat: number[] }) => void): DgisMap;
  project(point: number[]): number[]; unproject(point: number[]): number[];
  fitBounds(bounds: DgisBounds, options?: { padding?: { top: number; bottom: number; left: number; right: number }; maxZoom?: number; animation?: DgisAnimation }): DgisMap;
  getZoom(): number; setZoom(zoom: number, options?: DgisAnimation): DgisMap;
  setRotation(rotation: number, options?: DgisAnimation): DgisMap;
  setPitch(pitch: number, options?: DgisAnimation): DgisMap;
  setControlsLayoutPadding(padding: { top: number; bottom: number; left: number; right: number }): void;
  getCanvas(): HTMLCanvasElement;
};
export type DgisObject = { destroy(): void };
export type DgisSdk = {
  Map: new (host: HTMLElement, options: { center: number[]; zoom: number; key: string; lang: string; zoomControl: false; enableTrackResize: true; copyright: 'bottomLeft' }) => DgisMap;
  HtmlMarker: new (map: DgisMap, options: { coordinates: number[]; html: HTMLElement; anchor: number[]; interactive: boolean; preventMapInteractions: boolean }) => DgisObject;
  Polyline: new (map: DgisMap, options: { coordinates: number[][]; width: number; color: string; zIndex: number }) => DgisObject;
};

export const DGIS_SDK_URL = 'https://mapgl.2gis.com/api/js/v1.78.0';
const DGIS_SDK_SRI = 'sha512-metdG0w/fyK9oN0o5ErTJjVUIWw/yltMT0m4LAX81KbSVulXGL31TG6fM8nmjVfLt+HzMf7khAdKBbVdsCN81A==';
let pendingSdk: Promise<DgisSdk> | null = null;
const sdk = () => (window as Window & { mapgl?: DgisSdk }).mapgl;
const validSdk = (value: DgisSdk | undefined): value is DgisSdk => Boolean(value
  && typeof value.Map === 'function' && typeof value.HtmlMarker === 'function' && typeof value.Polyline === 'function');

/** Fixed pinned CDN + published SRI. No key in script URL, no arbitrary import URL.
 * Called only after dedicated public-browser-key approval, never at module import.
 */
export function loadDgisSdk(): Promise<DgisSdk> {
  const ready = sdk();
  if (validSdk(ready)) return Promise.resolve(ready);
  if (pendingSdk) return pendingSdk;
  pendingSdk = new Promise<DgisSdk>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = DGIS_SDK_URL; script.async = true; script.crossOrigin = 'anonymous';
    script.integrity = DGIS_SDK_SRI; script.referrerPolicy = 'strict-origin-when-cross-origin';
    const done = (failed: boolean) => {
      clearTimeout(timer); script.onload = null; script.onerror = null;
      const api = sdk();
      if (failed || !validSdk(api)) { script.remove(); pendingSdk = null; reject(new Error('MAP_SDK_UNAVAILABLE')); }
      else resolve(api);
    };
    const timer = window.setTimeout(() => done(true), 10_000);
    script.onload = () => done(false); script.onerror = () => done(true);
    document.head.appendChild(script);
  });
  return pendingSdk;
}

export function dgisBounds(points: number[][]): DgisBounds | null {
  if (!Array.isArray(points) || !points.length || points.length > 20_000 || points.some(point => !Array.isArray(point) || point.length < 2
    || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90)) return null;
  return points.reduce<DgisBounds>((bounds, point) => ({
    southWest: [Math.min(bounds.southWest[0], point[0]), Math.min(bounds.southWest[1], point[1])],
    northEast: [Math.max(bounds.northEast[0], point[0]), Math.max(bounds.northEast[1], point[1])],
  }), { southWest: [...points[0]], northEast: [...points[0]] });
}

export function approvedBrowserMapKey(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  return value.enabled === true && value.provider === '2gis' && typeof value.browserKey === 'string'
    && /^[a-zA-Z0-9._~-]{12,512}$/u.test(value.browserKey) ? value.browserKey : null;
}

export function dgisRouteBounds(line: { type: string; coordinates: number[][] } | null | undefined): DgisBounds | null {
  return line?.type === 'LineString' && Array.isArray(line.coordinates) && line.coordinates.length >= 2 ? dgisBounds(line.coordinates) : null;
}
