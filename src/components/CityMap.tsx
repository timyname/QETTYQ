"use client";

import { useEffect, useRef } from "react";
import type { CityEvent } from "@/data/events";

type MapPoint = Pick<CityEvent, "id" | "lat" | "lon"> & { title: string; dateLabel: string; category: string };

export function CityMap({ points, activeId, onSelect }: { points: MapPoint[]; activeId?: string; onSelect?: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    let disposed = false;
    let map: import("leaflet").Map | undefined;

    void import("leaflet").then((L) => {
      if (disposed || !host.current) return;
      map = L.map(host.current, { zoomControl: false, attributionControl: true }).setView([51.1282, 71.4304], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      const bounds: Array<[number, number]> = [];
      points.forEach((point, index) => {
        bounds.push([point.lat, point.lon]);
        const marker = L.marker([point.lat, point.lon], {
          icon: L.divIcon({
            className: "qettyq-map-marker-wrap",
            html: `<span class="qettyq-map-marker ${point.id === activeId ? "is-active" : ""}">${index + 1}</span>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          }),
        }).addTo(map!);
        marker.bindTooltip(`<b>${point.title}</b><br>${point.dateLabel}`, { direction: "top", offset: [0, -18] });
        marker.on("click", () => onSelect?.(point.id));
      });
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [42, 42], maxZoom: 13 });
    });

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [activeId, onSelect, points]);

  return <div className="city-map" ref={host} aria-label="Карта событий Астаны" />;
}
