'use client';

import { useEffect, useRef, useState } from 'react';
import { Compass, Minus, Plus } from 'lucide-react';
import { Localize, translateText, useI18n } from '../client/i18n';
import { dgisBounds, dgisRouteBounds, loadDgisSdk, type DgisMap, type DgisObject } from '../client/dgis-mapgl';
import { approvedDgisStyleId, dgisThemeOptions, QETTYQ_DGIS_PALETTE } from '../client/dgis-theme';
import { clusterMapPoints } from './CityMap';
import type { MapCanvasProps } from './MapCanvas';
import { markerIconPaths } from './map-marker-icons';
import s from './MapCanvas.module.css';

type Props = MapCanvasProps & { browserKey: string; styleId?: string; onUnavailable: () => void };
const valid = (point: { lat: number; lon: number }) => Number.isFinite(point.lat) && Number.isFinite(point.lon)
  && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180;
const animation = () => ({ animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, duration: 180 });

function mapPadding(host: HTMLElement) {
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;padding-top:var(--map-fit-top,150px);padding-bottom:var(--qettyq-safe-area-bottom,env(safe-area-inset-bottom,0px))';
  host.appendChild(probe);
  const computed = getComputedStyle(probe), css = getComputedStyle(host);
  const safeBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const shell = host.closest<HTMLElement>('[data-screen]');
  const safeTop = shell ? Number.parseFloat(getComputedStyle(shell).paddingTop) || 0 : 0;
  const top = Math.min(host.clientHeight * .45, (Number.parseFloat(computed.paddingTop) || 150) + safeTop);
  const ratio = Number.parseFloat(css.getPropertyValue('--map-fit-bottom-ratio')) || 0;
  const offset = Number.parseFloat(css.getPropertyValue('--map-fit-bottom-offset')) || 0;
  const bottom = Math.max(0, Math.min(host.clientHeight - top - 60, (ratio ? host.clientHeight * ratio + offset : Math.min(200, host.clientHeight * .28)) + safeBottom));
  probe.style.paddingBottom = 'var(--map-attribution-bottom,12px)';
  const creditBottom = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 12;
  probe.remove();
  // Native 2GIS copyright occupies the free band below the global 76px header
  // and above map toolbar / route-back controls (100–110px). The bottom dock and
  // expanded route sheet must never cover mandatory provider attribution.
  return { fit: { top, bottom, left: 42, right: 42 }, controls: { top: safeTop + 78, bottom: creditBottom + safeBottom, left: 16, right: 10 } };
}

function markerIcon(category: string) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
  for (const d of markerIconPaths(category)) { const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d); svg.appendChild(path); }
  return svg;
}

/** Only mounted with an explicitly approved public MapGL key.
 * Provider attribution remains its native SDK control; no copyright-hiding CSS.
 */
export function DgisMapCanvas(props: Props) {
  const { language } = useI18n();
  const host = useRef<HTMLDivElement>(null), map = useRef<DgisMap | null>(null);
  const latest = useRef(props), renderMap = useRef<(() => void) | null>(null);
  const [loaded, setLoaded] = useState(false);
  const styleId = approvedDgisStyleId(props.styleId);
  useEffect(() => { latest.current = props; renderMap.current?.(); }, [props]);

  useEffect(() => {
    if (!host.current) return;
    setLoaded(false);
    let disposed = false, failed = false, ready = false;
    let objects: DgisObject[] = [], routeObjects: DgisObject[] = [], popup: DgisObject | null = null;
    let geometry: MapCanvasProps['routeGeometry'];
    let fittedPoints = false;
    let timer: number | undefined;
    let canvas: HTMLCanvasElement | undefined;
    const removeObjects = () => { objects.forEach(object => object.destroy()); objects = []; popup?.destroy(); popup = null; };
    const removeRoute = () => { routeObjects.forEach(object => object.destroy()); routeObjects = []; };
    const fail = () => {
      if (disposed || failed) return;
      failed = true; clearTimeout(timer); removeObjects(); removeRoute();
      canvas?.removeEventListener('webglcontextlost', fail);
      map.current?.destroy(); map.current = null; renderMap.current = null;
      latest.current.onUnavailable();
    };
    void loadDgisSdk().then(api => {
      if (disposed || failed || !host.current?.isConnected) return;
      const view = new api.Map(host.current, { center: [71.4304, 51.1282], zoom: 13, key: props.browserKey,
        lang: language, zoomControl: false, enableTrackResize: true, copyright: 'topLeft', ...dgisThemeOptions(styleId) });
      map.current = view;
      view.setControlsLayoutPadding(mapPadding(host.current).controls);
      canvas = view.getCanvas(); canvas.addEventListener('webglcontextlost', fail);

      const render = () => {
        const container = host.current;
        if (disposed || failed || !ready || !container?.isConnected || map.current !== view) return;
        try {
          removeObjects();
          const current = latest.current, padding = mapPadding(container);
          view.setControlsLayoutPadding(padding.controls);
          const line = current.routeGeometry;
          const bounds = dgisRouteBounds(line);
          if (line !== geometry) {
            removeRoute(); geometry = line;
            if (bounds && line) {
              routeObjects = [new api.Polyline(view, { coordinates: line.coordinates, width: 9, color: QETTYQ_DGIS_PALETTE.pearl, zIndex: 10 }),
                new api.Polyline(view, { coordinates: line.coordinates, width: 5, color: QETTYQ_DGIS_PALETTE.jade, zIndex: 11 })];
              view.fitBounds(bounds, { maxZoom: 16, padding: padding.fit, animation: animation() });
            }
          }
          const points = current.points.filter(valid);
          const origin = current.origin && valid(current.origin) ? current.origin : null;
          if (!fittedPoints && current.fitPoints && !bounds) {
            const all = [...points.map(point => [point.lon, point.lat]), ...(origin ? [[origin.lon, origin.lat]] : [])];
            const box = dgisBounds(all);
            if (box) { fittedPoints = true; view.fitBounds(box, { maxZoom: 14, padding: padding.fit, animation: { animate: false } }); }
          }
          const groups = clusterMapPoints(points, point => { const pixel = view.project([point.lon, point.lat]); return { x: pixel[0], y: pixel[1] }; },
            { width: container.clientWidth, height: container.clientHeight }, current.activeId);
          for (const group of groups) {
            const button = document.createElement('button'); button.type = 'button';
            const multiple = group.points.length > 1;
            button.className = `${s.marker} ${multiple ? s.cluster : ''} ${!multiple && group.points[0].id === current.activeId ? s.active : ''}`;
            const coordinates = view.unproject([group.x, group.y]);
            if (multiple) {
              button.textContent = String(group.points.length);
              button.title = translateText(`Мест: ${group.points.length}. Приблизить`, language);
              button.addEventListener('click', event => {
                event.stopPropagation();
                if (view.getZoom() < 18.9) {
                  const box = dgisBounds(group.points.map(point => [point.lon, point.lat]));
                  if (box) view.fitBounds(box, { maxZoom: Math.min(19, view.getZoom() + 2), padding: padding.fit, animation: animation() });
                } else {
                  popup?.destroy();
                  const list = document.createElement('div'); list.className = s.coincident;
                  const close = document.createElement('button'); close.type = 'button'; close.textContent = translateText('Закрыть', language);
                  close.addEventListener('click', () => { popup?.destroy(); popup = null; }); list.appendChild(close);
                  for (const point of group.points) { const item = document.createElement('button'); item.type = 'button'; item.textContent = point.title;
                    item.addEventListener('click', () => { latest.current.onSelect?.(point.id); popup?.destroy(); popup = null; }); list.appendChild(item); }
                  popup = new api.HtmlMarker(view, { coordinates, html: list, anchor: [0, 0], interactive: true, preventMapInteractions: true });
                }
              });
            } else {
              const point = group.points[0]; button.title = `${point.title}${point.dateLabel ? ` · ${point.dateLabel}` : ''}`;
              button.setAttribute('aria-pressed', String(point.id === current.activeId)); button.appendChild(markerIcon(point.category));
              button.addEventListener('click', event => { event.stopPropagation(); latest.current.onSelect?.(point.id); });
            }
            button.setAttribute('aria-label', button.title);
            objects.push(new api.HtmlMarker(view, { coordinates, html: button, anchor: [22, 22], interactive: true, preventMapInteractions: true }));
          }
          if (origin) {
            const dot = document.createElement('div'); dot.className = s.origin; dot.setAttribute('role', 'img'); dot.setAttribute('aria-label', translateText('Точка старта маршрута', language));
            objects.push(new api.HtmlMarker(view, { coordinates: [origin.lon, origin.lat], html: dot, anchor: [9, 9], interactive: false, preventMapInteractions: true }));
          }
        } catch { fail(); }
      };
      renderMap.current = render;
      view.on('styleload', () => { if (disposed || failed) return; ready = true; clearTimeout(timer); setLoaded(true); render(); });
      view.on('styleloaderror', fail);
      // Since MapGL 1.61, `error` also reports invalidtilekey (including revoked /
      // exhausted access), styleloaderror and webglcontextlost. Stop the SDK even
      // after styleload: otherwise a working style may hide unusable map tiles.
      // Never render or log its payload: provider messages can contain key URLs.
      view.on('error', fail);
      view.on('click', event => { const point = { lat: event.lngLat[1], lon: event.lngLat[0] }; if (valid(point)) latest.current.onPick?.(point); });
      for (const type of ['centerend', 'zoomend', 'rotationend', 'pitchend', 'resize'] as const) view.on(type, render);
      timer = window.setTimeout(() => { if (!ready) fail(); }, 15_000);
    }).catch(fail);
    return () => { disposed = true; clearTimeout(timer); canvas?.removeEventListener('webglcontextlost', fail); removeObjects(); removeRoute(); map.current?.destroy(); map.current = null; renderMap.current = null; };
  }, [props.browserKey, styleId, language]);

  return <Localize><div className={s.root} data-map-engine="2gis" data-map-theme={styleId ? 'qettyq-published-style' : 'qettyq-overlays'} data-map-ready={loaded} data-route-quality={dgisRouteBounds(props.routeGeometry) && loaded ? 'street' : 'none'}>
    <div ref={host} className={s.canvas} aria-label="Интерактивная карта Астаны" />
    {!loaded && <p className={s.notice} role="status">Загружаем карту Астаны…</p>}
    {loaded && <div className={s.controls} role="group" aria-label="Управление картой">
      <button type="button" aria-label="Приблизить карту" onClick={() => map.current?.setZoom(Math.min(19, map.current.getZoom() + 1), animation())}><Plus size={20} /></button>
      <button type="button" aria-label="Отдалить карту" onClick={() => map.current?.setZoom(Math.max(3, map.current.getZoom() - 1), animation())}><Minus size={20} /></button>
      <button type="button" aria-label="Ориентировать карту на север" onClick={() => { map.current?.setRotation(0, animation()); map.current?.setPitch(0, animation()); }}><Compass size={20} /></button>
    </div>}
    {props.routeAttribution && <div className={s.routeCredit}><a href={props.routeAttribution.url} target="_blank" rel="noreferrer">{props.routeAttribution.text}</a></div>}
  </div></Localize>;
}
