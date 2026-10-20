'use client';

import { useEffect, useRef, useState } from 'react';
import { Compass, Minus, Plus } from 'lucide-react';
import type { Map as VectorMap, Marker } from 'maplibre-gl';
import type { RouteGeometry } from '../server/pilot/street-routing';
import { CityMap, clusterMapPoints } from './CityMap';
import { loadQettyqMapStyle } from './map-style';
import { markerIconPaths } from './map-marker-icons';
import s from './MapCanvas.module.css';

export type MapCanvasPoint = { id: string; title: string; dateLabel: string; category: string; lat: number; lon: number };
type Coordinates = { lat: number; lon: number };
export type MapCanvasProps = { points: MapCanvasPoint[]; activeId?: string; onSelect?: (id: string) => void; onPick?: (point: Coordinates) => void; origin?: Coordinates | null; fitPoints?: boolean; routeGeometry?: RouteGeometry | null; routeAttribution?: { text: string; url: string } | null };

const ASTANA: [number, number] = [71.4304, 51.1282];
const SVG_NS = 'http://www.w3.org/2000/svg';
const validCoordinates = (point: Coordinates) => Number.isFinite(point.lat) && Number.isFinite(point.lon) && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180;
const animation = () => ({ duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180 });

/** Trusted static UI paths; titles/dates from data are never inserted as HTML. */
function categoryIcon(category: string, document: Document) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(name, value);
  const paths = markerIconPaths(category);
  paths.forEach(d => { const path = document.createElementNS(SVG_NS, 'path'); path.setAttribute('d', d); svg.appendChild(path); });
  return svg;
}

export function MapCanvas(props: MapCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<VectorMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const latest = useRef(props);
  const renderMarkers = useRef<(() => void) | null>(null);
  const [fallback, setFallback] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { latest.current = props; renderMarkers.current?.(); }, [props]);

  useEffect(() => {
    if (!host.current) return;
    let disposed = false, failed = false, didLoad = false;
    let observer: ResizeObserver | undefined;
    const controller = new AbortController();
    const styleTimer = window.setTimeout(() => controller.abort(), 8_000);
    let startupTimer: number | undefined;
    function removeMarkers() { markers.current.forEach(marker => marker.remove()); markers.current = []; }
    function fail() {
      if (disposed || failed) return;
      failed = true; observer?.disconnect(); controller.abort();
      clearTimeout(styleTimer); clearTimeout(startupTimer);
      removeMarkers(); map.current?.remove(); map.current = null;
      renderMarkers.current = null; setFallback(true);
    }

    void Promise.all([import('maplibre-gl'), loadQettyqMapStyle(controller.signal)]).then(([gl, style]) => {
      clearTimeout(styleTimer);
      if (disposed || !host.current) return;
      gl.setWorkerUrl('/assets/maplibre-gl-worker.mjs');
      const view = new gl.Map({ container: host.current, style, center: ASTANA, zoom: 13, minZoom: 3, maxZoom: 19, maxPitch: 60, attributionControl: false, canvasContextAttributes: { antialias: false } });
      map.current = view;
      view.addControl(new gl.AttributionControl({ compact: false }), 'bottom-left');
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
      let fittedRoute: RouteGeometry | null = null;

      const render = () => {
        // React can detach the host before a queued ResizeObserver/map event runs.
        const container = host.current;
        if (disposed || failed || !didLoad || !container?.isConnected || map.current !== view) return;
        removeMarkers();
        const bounds = container.getBoundingClientRect();
        const current = latest.current;
        const line = current.routeGeometry;
        const validLine = line?.type === 'LineString' && line.coordinates.length >= 2 && line.coordinates.length <= 20_000 && line.coordinates.every(p => p.length >= 2 && validCoordinates({ lat: p[1], lon: p[0] }));
        const routeData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: validLine ? [{ type: 'Feature', properties: {}, geometry: line! }] : [] };
        const source = view.getSource('qettyq-street-route');
        if (source && 'setData' in source) (source as import('maplibre-gl').GeoJSONSource).setData(routeData);
        else if (validLine) {
          view.addSource('qettyq-street-route', { type: 'geojson', data: routeData });
          const firstLabel = view.getStyle().layers.find(layer => layer.type === 'symbol')?.id;
          view.addLayer({ id: 'qettyq-route-halo', type: 'line', source: 'qettyq-street-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#F4F6F2', 'line-width': 9, 'line-opacity': .95 } }, firstLabel);
          view.addLayer({ id: 'qettyq-route-line', type: 'line', source: 'qettyq-street-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#0B6E5D', 'line-width': 5, 'line-opacity': .95 } }, firstLabel);
        }
        if (validLine && line !== fittedRoute) {
          fittedRoute = line!;
          const box = line!.coordinates.reduce((b, p) => b.extend(p), new gl.LngLatBounds(line!.coordinates[0], line!.coordinates[0]));
          const height = container.clientHeight, css = getComputedStyle(container);
          const top = Number.parseFloat(css.getPropertyValue('--map-fit-top')) || 150;
          const ratio = Number.parseFloat(css.getPropertyValue('--map-fit-bottom-ratio')) || .25;
          const offset = Number.parseFloat(css.getPropertyValue('--map-fit-bottom-offset')) || 0;
          const bottom = Math.max(0, Math.min(height - top - 60, height * ratio + offset));
          view.fitBounds(box, { maxZoom: 16, duration, padding: { top, bottom, left: 42, right: 42 } });
        }
        const groups = clusterMapPoints(current.points.filter(validCoordinates), point => view.project([point.lon, point.lat]), { width: bounds.width, height: bounds.height }, current.activeId);
        for (const group of groups) {
          const button = document.createElement('button'); button.type = 'button';
          button.className = `${s.marker} ${group.points.length > 1 ? s.cluster : ''} ${group.points[0].id === current.activeId && group.points.length === 1 ? s.active : ''}`;
          const position = view.unproject([group.x, group.y]);
          if (group.points.length > 1) {
            button.textContent = String(group.points.length);
            button.title = `Мест: ${group.points.length}. Приблизить`;
            button.setAttribute('aria-label', button.title);
            button.addEventListener('click', event => {
              event.stopPropagation();
              if (view.getZoom() < 18.9) {
                const first = group.points[0];
                const box = group.points.reduce((b, p) => b.extend([p.lon, p.lat]), new gl.LngLatBounds([first.lon, first.lat], [first.lon, first.lat]));
                view.fitBounds(box, { padding: 64, maxZoom: Math.min(19, view.getZoom() + 2), duration });
              } else {
                const list = document.createElement('div'); list.className = s.coincident;
                group.points.forEach(point => { const item = document.createElement('button'); item.type = 'button'; item.textContent = point.title; item.addEventListener('click', () => { latest.current.onSelect?.(point.id); popup.remove(); }); list.appendChild(item); });
                const popup = new gl.Popup({ maxWidth: '270px' }).setLngLat(position).setDOMContent(list).addTo(view);
              }
            });
          } else {
            const point = group.points[0];
            button.title = `${point.title}${point.dateLabel ? ` · ${point.dateLabel}` : ''}`;
            button.setAttribute('aria-label', button.title);
            button.setAttribute('aria-pressed', String(point.id === current.activeId));
            button.appendChild(categoryIcon(point.category, document));
            button.addEventListener('click', event => { event.stopPropagation(); latest.current.onSelect?.(point.id); });
          }
          markers.current.push(new gl.Marker({ element: button, anchor: 'center' }).setLngLat(position).addTo(view));
        }
        const origin = current.origin;
        if (origin && validCoordinates(origin)) {
          const dot = document.createElement('div'); dot.className = s.origin; dot.setAttribute('role', 'img'); dot.setAttribute('aria-label', 'Точка старта маршрута');
          markers.current.push(new gl.Marker({ element: dot }).setLngLat([origin.lon, origin.lat]).addTo(view));
        }
      };
      renderMarkers.current = render;
      view.on('load', () => {
        const container = host.current;
        if (disposed || failed || !container?.isConnected || map.current !== view) return;
        didLoad = true; clearTimeout(startupTimer); setLoaded(true);
        const valid = latest.current.points.filter(validCoordinates);
        const origin = latest.current.origin;
        if (origin && validCoordinates(origin)) valid.push({ ...origin, id: 'route-origin', title: 'Старт', dateLabel: '', category: 'origin' });
        if (latest.current.fitPoints && valid.length) {
          const first = valid[0];
          const box = valid.reduce((b, p) => b.extend([p.lon, p.lat]), new gl.LngLatBounds([first.lon, first.lat], [first.lon, first.lat]));
          const height = container.clientHeight;
          const css = getComputedStyle(container);
          const ratio = Number.parseFloat(css.getPropertyValue('--map-fit-bottom-ratio')) || 0;
          const offset = Number.parseFloat(css.getPropertyValue('--map-fit-bottom-offset')) || 0;
          const top = Number.parseFloat(css.getPropertyValue('--map-fit-top')) || Math.min(150, height * .2);
          const bottom = ratio ? Math.min(height - top - 60, height * ratio + offset) : Math.min(200, height * .28);
          view.fitBounds(box, { maxZoom: 14, duration: 0, padding: { top, bottom, left: 42, right: 42 } });
        }
        render();
      });
      view.on('click', event => latest.current.onPick?.({ lat: event.lngLat.lat, lon: event.lngLat.lng }));
      view.on('moveend', render); view.on('resize', render);
      view.on('error', () => { if (!didLoad) fail(); });
      view.on('webglcontextlost', fail);
      startupTimer = window.setTimeout(() => { if (!didLoad) fail(); }, 15_000);
      observer = new ResizeObserver(() => { if (!disposed && !failed && host.current?.isConnected && map.current === view) view.resize(); }); observer.observe(host.current);
    }).catch(fail);

    return () => { disposed = true; controller.abort(); clearTimeout(styleTimer); clearTimeout(startupTimer); observer?.disconnect(); removeMarkers(); map.current?.remove(); map.current = null; renderMarkers.current = null; };
  }, []);

  return <div className={s.root} data-map-engine={fallback ? 'fallbackleaflet' : 'maplibre'} data-route-quality={props.routeGeometry && loaded && !fallback ? 'street' : 'none'}>
    {fallback ? <><CityMap {...props} /><p className={s.notice} role="status">Векторная карта недоступна. Резервный режим OpenStreetMap.</p></> : <>
      <div ref={host} className={s.canvas} aria-label="Интерактивная карта Астаны" />
      {!loaded && <p className={s.notice} role="status">Загружаем карту Астаны…</p>}
      {loaded && <div className={s.controls} role="group" aria-label="Управление картой">
        <button type="button" aria-label="Приблизить карту" onClick={() => map.current?.zoomIn(animation())}><Plus size={20} /></button>
        <button type="button" aria-label="Отдалить карту" onClick={() => map.current?.zoomOut(animation())}><Minus size={20} /></button>
        <button type="button" aria-label="Ориентировать карту на север" onClick={() => map.current?.resetNorthPitch(animation())}><Compass size={20} /></button>
      </div>}
    </>}
    {props.routeAttribution && <div className={s.routeCredit}><a href={props.routeAttribution.url} target="_blank" rel="noreferrer">{props.routeAttribution.text}</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Исправить карту</a>{fallback && <span>Линия пути недоступна в резервном режиме.</span>}</div>}
  </div>;
}
