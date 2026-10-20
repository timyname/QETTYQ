"use client";

import { useEffect, useRef, useState } from "react";
import type { CityEvent } from "@/data/events";
import type { LayerGroup, Map as LeafletMap } from "leaflet";

type MapPoint = Pick<CityEvent, "id" | "lat" | "lon"> & { title: string; dateLabel: string; category: string };
type Coordinates = { lat: number; lon: number };
type ScreenPoint = { x: number; y: number };
type PointCluster = ScreenPoint & { points: MapPoint[] };
type Props = {
  points: MapPoint[];
  activeId?: string;
  onSelect?: (id: string) => void;
  onPick?: (point: Coordinates) => void;
  origin?: Coordinates | null;
};

export function createMapTooltip(point: Pick<MapPoint, "title" | "dateLabel">, document: Document) {
  const tooltip = document.createElement("div");
  const title = document.createElement("strong");
  const date = document.createElement("span");
  title.textContent = point.title;
  date.textContent = point.dateLabel;
  tooltip.append(title, document.createElement("br"), date);
  return tooltip;
}

/** Grid buckets narrow neighbour checks; distances are screen pixels, not metres. */
export function clusterMapPoints(points: MapPoint[], project: (point: MapPoint) => ScreenPoint, size: { width: number; height: number }, activeId?: string, cellSize = 52): PointCluster[] {
  const clusters: PointCluster[] = [];
  const cells = new Map<string, PointCluster[]>();
  const step = Number.isFinite(cellSize) && cellSize > 0 ? cellSize : 52;
  for (const point of points) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) continue;
    const pixel = project(point);
    if (!Number.isFinite(pixel.x) || !Number.isFinite(pixel.y) || pixel.x < 0 || pixel.y < 0 || pixel.x > size.width || pixel.y > size.height) continue;
    if (point.id === activeId) {
      clusters.push({ ...pixel, points: [point] });
      continue;
    }
    const col = Math.floor(pixel.x / step);
    const row = Math.floor(pixel.y / step);
    let nearby: PointCluster | undefined;
    for (let dx = -1; dx <= 1 && !nearby; dx++) {
      for (let dy = -1; dy <= 1 && !nearby; dy++) {
        nearby = cells.get(`${col + dx}:${row + dy}`)?.find(cluster => Math.hypot(pixel.x - cluster.x, pixel.y - cluster.y) <= step);
      }
    }
    if (nearby) {
      const previousCount = nearby.points.length;
      const oldKey = `${Math.floor(nearby.x / step)}:${Math.floor(nearby.y / step)}`;
      nearby.x = (nearby.x * previousCount + pixel.x) / (previousCount + 1);
      nearby.y = (nearby.y * previousCount + pixel.y) / (previousCount + 1);
      nearby.points.push(point);
      const newKey = `${Math.floor(nearby.x / step)}:${Math.floor(nearby.y / step)}`;
      if (newKey !== oldKey) {
        cells.set(oldKey, (cells.get(oldKey) ?? []).filter(cluster => cluster !== nearby));
        cells.set(newKey, [...(cells.get(newKey) ?? []), nearby]);
      }
    } else {
      const cluster = { ...pixel, points: [point] };
      clusters.push(cluster);
      const key = `${col}:${row}`;
      cells.set(key, [...(cells.get(key) ?? []), cluster]);
    }
  }
  return clusters;
}

export function clusterMarkerSize(count: number) {
  return Math.min(46, 34 + Math.floor(Math.log2(Math.max(1, count))) * 2);
}

export function createClusterLabel(count: number, document: Document) {
  const icon = document.createElement("span");
  const size = clusterMarkerSize(count);
  icon.className = "qettyq-map-cluster";
  icon.textContent = String(count);
  Object.assign(icon.style, {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: `${size}px`, height: `${size}px`, borderRadius: "50%", boxSizing: "border-box",
    background: "linear-gradient(145deg,#f8ffedf0,#e2f1e9f0)", color: "#0B332D",
    border: "2px solid #ffffff", fontSize: "13px", fontWeight: "800",
    boxShadow: "0 3px 12px #0b332d30,inset 0 1px 0 #ffffff", backdropFilter: "blur(10px)",
  });
  return icon;
}

export function CityMap({ points, activeId, onSelect, onPick, origin }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const callbacks = useRef({ onSelect, onPick });
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => { callbacks.current = { onSelect, onPick }; }, [onSelect, onPick]);

  useEffect(() => {
    if (!host.current) return;
    let disposed = false;
    let map: LeafletMap | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const resize = () => map?.invalidateSize({ pan: false });

    void import("leaflet").then((L) => {
      if (disposed || !host.current) return;
      map = L.map(host.current, { zoomControl: false, attributionControl: true }).setView([51.1282, 71.4304], 12);
      mapRef.current = map;
      leafletRef.current = L;
      layerRef.current = L.layerGroup().addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.on("click", (event) => callbacks.current.onPick?.({ lat: event.latlng.lat, lon: event.latlng.lng }));
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host.current);
      }
      window.addEventListener("resize", resize);
      resize();
      setReady(true);
    }).catch(() => {
      if (!disposed) setError(true);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      map?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      layerRef.current = null;
    };
  }, []);

  const originLat = origin?.lat;
  const originLon = origin?.lon;
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer || !host.current) return;
    const document = host.current.ownerDocument;
    const numberById = new Map(points.map((point, index) => [point.id, index + 1]));
    const renderPoints = () => {
      layer.clearLayers();
      const viewport = map.getSize();
      const groups = clusterMapPoints(points, point => map.latLngToContainerPoint([point.lat, point.lon]), { width: viewport.x, height: viewport.y }, activeId);
      for (const group of groups) {
        if (group.points.length > 1) {
          const size = clusterMarkerSize(group.points.length);
          const position = map.containerPointToLatLng([group.x, group.y]);
          const marker = L.marker(position, {
            bubblingMouseEvents: false, title: `Мест: ${group.points.length}. Приблизить`, alt: `Мест: ${group.points.length}. Приблизить`,
            icon: L.divIcon({ className: "qettyq-map-cluster-wrap", html: createClusterLabel(group.points.length, document), iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
          }).addTo(layer);
          marker.bindTooltip(createMapTooltip({ title: `Мест: ${group.points.length}`, dateLabel: "Нажмите, чтобы приблизить" }, document));
          marker.on("click", () => {
            if (map.getZoom() < 19) {
              map.fitBounds(group.points.map(point => [point.lat, point.lon] as [number, number]), { padding: [52, 52], maxZoom: Math.min(19, map.getZoom() + 2) });
            } else {
              // Several records can share coordinates; keep them selectable at max zoom.
              const list = document.createElement("div");
              for (const point of group.points) {
                const button = document.createElement("button");
                button.type = "button";
                button.textContent = point.title;
                Object.assign(button.style, { display: "block", width: "100%", minHeight: "44px", border: "0", borderBottom: "1px solid #d9e5df", background: "white", color: "#0B332D", textAlign: "left", padding: "8px" });
                button.addEventListener("click", () => { map.closePopup(); callbacks.current.onSelect?.(point.id); });
                list.append(button);
              }
              L.popup({ maxHeight: 240 }).setLatLng(position).setContent(list).openOn(map);
            }
          });
          continue;
        }
        const point = group.points[0];
        const active = point.id === activeId;
        const icon = document.createElement("span");
        icon.className = `qettyq-map-marker${active ? " is-active" : ""}`;
        icon.textContent = String(numberById.get(point.id));
        const marker = L.marker([point.lat, point.lon], {
          bubblingMouseEvents: false, title: point.title, alt: point.title, zIndexOffset: active ? 1000 : 0,
          icon: L.divIcon({ className: "qettyq-map-marker-wrap", html: icon, iconSize: [38, 38], iconAnchor: [19, 19] }),
        }).addTo(layer);
        marker.bindTooltip(createMapTooltip(point, document), { direction: "top", offset: [0, -18] });
        marker.on("click", () => callbacks.current.onSelect?.(point.id));
      }
      if (originLat !== undefined && originLon !== undefined && Number.isFinite(originLat) && Number.isFinite(originLon)) {
        L.circleMarker([originLat, originLon], { radius: 8, color: "#ffffff", weight: 3, fillColor: "#0B6E5D", fillOpacity: 1, interactive: false }).addTo(layer);
      }
    };
    const bounds: Array<[number, number]> = points.filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lon)).map(point => [point.lat, point.lon]);
    if (originLat !== undefined && originLon !== undefined && Number.isFinite(originLat) && Number.isFinite(originLon)) {
      bounds.push([originLat, originLon]);
    }
    if (!fitted.current && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [42, 42], maxZoom: 13 });
      fitted.current = true;
    }
    map.on("zoomend moveend resize", renderPoints);
    renderPoints();
    return () => { map.off("zoomend moveend resize", renderPoints); layer.clearLayers(); };
  }, [points, activeId, originLat, originLon, ready]);

  useEffect(() => {
    const point = points.find(point => point.id === activeId);
    if (ready && point && Number.isFinite(point.lat) && Number.isFinite(point.lon)) mapRef.current?.panInside([point.lat, point.lon], { padding: [30, 30] });
  }, [activeId, points, ready]);

  return <div className="city-map" ref={host} aria-label="Карта событий Астаны">{error && <p role="status">Не удалось загрузить карту. Список мест остаётся доступным.</p>}</div>;
}
