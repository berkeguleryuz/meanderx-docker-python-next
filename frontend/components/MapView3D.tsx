"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { SubstationSummary } from "@/lib/api";
import { addBuildings, CARTO_STYLE, ensureMapLibre } from "@/lib/maplibre";

export default function MapView3D({
  geometry,
  substations = [],
  selectedSubstation = null,
  onSelectSubstation,
}: {
  geometry: GeoJSON.FeatureCollection | null;
  substations?: SubstationSummary[];
  selectedSubstation?: string | null;
  onSelectSubstation?: (name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const readyRef = useRef(false);
  const markersRef = useRef<any[]>([]);
  const popupRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map: any = null;

    ensureMapLibre().then((maplibregl) => {
      if (cancelled || !containerRef.current) return;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: CARTO_STYLE,
        center: [-73.87, 40.75],
        zoom: 9.6,
        pitch: 48,
        bearing: -10,
        canvasContextAttributes: { preserveDrawingBuffer: true },
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      setReady(true);
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");

      map.on("load", () => {
        addBuildings(map);
        map.addSource("feeder", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "feeder-glow",
          type: "line",
          source: "feeder",
          paint: { "line-color": "#6f8fff", "line-width": 10, "line-opacity": 0.25, "line-blur": 5 },
        });
        map.addLayer({
          id: "feeder-line",
          type: "line",
          source: "feeder",
          paint: { "line-color": "#3d5eff", "line-width": 3.5 },
        });
        readyRef.current = true;
        map.fire("meanderx.ready");
      });
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (map) map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = typeof window !== "undefined" ? window.maplibregl : null;
    if (!ready || !map || !maplibregl) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    const seen = new Map<string, number>();
    for (const s of substations) {
      if (!s.geometry_geojson) continue;
      const point = JSON.parse(s.geometry_geojson) as { coordinates: [number, number] };
      let [lng, lat] = point.coordinates;
      const key = `${lng.toFixed(5)},${lat.toFixed(5)}`;
      const dup = seen.get(key) ?? 0;
      seen.set(key, dup + 1);
      if (dup > 0) {
        lng += 0.004 * dup;
        lat += 0.0015 * dup;
      }

      const isSelected = s.name === selectedSubstation;
      const el = document.createElement("div");
      if (isSelected) {
        el.className = "logo-pin";
        el.innerHTML = '<img src="/meanderx.png" alt="" />';
      } else {
        el.className = "dot3d" + (s.location_source === "estimated" ? " est" : "");
      }
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectSubstation?.(s.name);
      });
      el.addEventListener("mouseenter", () => {
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14,
        })
          .setLngLat([lng, lat])
          .setHTML(
            `<strong>${s.name}</strong> substation<br/>` +
              `${s.feeder_count ?? "?"} feeders<br/>` +
              `${s.connected_mw?.toFixed(1) ?? "?"} MW connected · ${s.queued_mw?.toFixed(1) ?? "?"} MW queued<br/>` +
              (s.location_source === "estimated"
                ? "Estimated from feeder geometry · click to open"
                : "Click to open"),
          )
          .addTo(map);
      });
      el.addEventListener("mouseleave", () => {
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      });

      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map));
    }
  }, [ready, substations, selectedSubstation, onSelectSubstation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const apply = () => {
      const src = map.getSource("feeder");
      if (!src) return;
      src.setData(geometry ?? { type: "FeatureCollection", features: [] });
      if (geometry && geometry.features.length > 0 && window.maplibregl) {
        const bounds = new window.maplibregl.LngLatBounds();
        for (const f of geometry.features) {
          const g = f.geometry as unknown as { coordinates: [number, number][][] };
          for (const line of g.coordinates) for (const c of line) bounds.extend(c);
        }
        const cam = map.cameraForBounds(bounds, { padding: 80, maxZoom: 15.2 });
        if (cam) map.flyTo({ ...cam, pitch: 55, duration: 1400 });
      }
    };
    if (readyRef.current) apply();
    else map.once("meanderx.ready", apply);
  }, [ready, geometry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedSubstation || geometry) return;
    const s = substations.find((x) => x.name === selectedSubstation);
    if (!s?.geometry_geojson) return;
    const [lng, lat] = (JSON.parse(s.geometry_geojson) as { coordinates: [number, number] })
      .coordinates;
    map.flyTo({ center: [lng, lat - 0.03], zoom: 12.3, pitch: 52, duration: 1200 });
  }, [ready, selectedSubstation, substations, geometry]);

  return <div ref={containerRef} className="map3d" />;
}
