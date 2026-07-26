"use client";
import { useEffect, useRef, useState } from "react";
import { FeederDetail } from "@/lib/api";
import { CARTO_STYLE as STYLE, ensureMapLibre } from "@/lib/maplibre";

/* eslint-disable @typescript-eslint/no-explicit-any */

function pathOf(feeder: FeederDetail): [number, number][] {
  const coords: [number, number][] = [];
  for (const f of feeder.geometry.features) {
    const g = f.geometry as { type: string; coordinates: [number, number][][] };
    if (g.type === "MultiLineString") for (const line of g.coordinates) coords.push(...line);
  }
  return coords;
}

export default function Tour3D({
  feeder,
  onClose,
}: {
  feeder: FeederDetail;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const [flying, setFlying] = useState(true);
  const flyingRef = useRef(true);

  useEffect(() => {
    flyingRef.current = flying;
  }, [flying]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!containerRef.current) return;
    const path = pathOf(feeder);
    if (path.length < 2) return;

    let cancelled = false;
    let map: any = null;

    ensureMapLibre().then((maplibregl) => {
      if (cancelled || !containerRef.current) return;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE,
        center: path[0],
        zoom: 15.2,
        pitch: 62,
        bearing: 0,
        canvasContextAttributes: { preserveDrawingBuffer: true },
        attributionControl: { compact: true },
      });

      map.on("load", () => {
        try {
          const building = map.getStyle().layers?.find((l: any) => l.id.includes("building"));
          if (building && building.source) {
            map.addLayer({
              id: "tour-extrusion",
              type: "fill-extrusion",
              source: building.source,
              "source-layer": building["source-layer"] ?? "building",
              paint: {
                "fill-extrusion-color": "#d7dce4",
                "fill-extrusion-height": 14,
                "fill-extrusion-opacity": 0.75,
              },
            });
          }
        } catch {}

        map.addSource("feeder", { type: "geojson", data: feeder.geometry });
        map.addLayer({
          id: "feeder-glow",
          type: "line",
          source: "feeder",
          paint: { "line-color": "#6f8fff", "line-width": 12, "line-opacity": 0.25, "line-blur": 6 },
        });
        map.addLayer({
          id: "feeder-line",
          type: "line",
          source: "feeder",
          paint: { "line-color": "#3d5eff", "line-width": 4 },
        });

        let i = 0;
        let t = 0;
        const SPEED = 0.007;
        const tick = () => {
          if (flyingRef.current && i < path.length - 1) {
            t += SPEED;
            if (t >= 1) {
              t = 0;
              i += 1;
            }
            if (i < path.length - 1) {
              const [x1, y1] = path[i];
              const [x2, y2] = path[i + 1];
              const lng = x1 + (x2 - x1) * t;
              const lat = y1 + (y2 - y1) * t;
              const bearing = (Math.atan2(x2 - x1, y2 - y1) * 180) / Math.PI;
              map.jumpTo({ center: [lng, lat], bearing, pitch: 62, zoom: 15.6 });
            } else {
              setFlying(false);
            }
          }
          frameRef.current = requestAnimationFrame(tick);
        };
        map.once("idle", () => {
          frameRef.current = requestAnimationFrame(tick);
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      if (map) map.remove();
    };
  }, [feeder]);

  return (
    <div className="tour" role="dialog" aria-label={`3D tour of feeder ${feeder.feeder_id}`}>
      <div ref={containerRef} className="tour-map" />
      <div className="tour-hud">
        <div>
          <span className="eyebrow">3D tour</span>
          <strong>{feeder.feeder_id}</strong>
          <span className="muted"> · {feeder.segment_count} segments</span>
        </div>
        <div className="tour-actions">
          <button onClick={() => setFlying((f) => !f)}>{flying ? "Pause" : "Resume"}</button>
          <button onClick={onClose}>Exit (Esc)</button>
        </div>
      </div>
    </div>
  );
}
