"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { SubstationDetail } from "@/lib/api";
import { addBuildings, CARTO_STYLE, ensureMapLibre } from "@/lib/maplibre";

const LEGS = 6;
const SPEED = 0.016;
const ORBIT_MS = 3500;
const ORBIT_ARC = 70;

type Path = [number, number][];

function pathsFromGeometry(geometry: { features: { geometry: unknown }[] }): Path {
  const coords: Path = [];
  for (const f of geometry.features) {
    const g = f.geometry as { type: string; coordinates: [number, number][][] };
    if (g.type === "MultiLineString") for (const line of g.coordinates) coords.push(...line);
  }
  return coords;
}

export default function SubstationTour3D({
  substation,
  onClose,
}: {
  substation: SubstationDetail;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const cancelledRef = useRef(false);
  const flyingRef = useRef(true);
  const abortLegRef = useRef(false);
  const jumpRef = useRef<number | null>(null);
  const legRef = useRef(-1);
  const [flying, setFlying] = useState(true);
  const [label, setLabel] = useState(substation.name);

  const legs = useMemo(
    () =>
      [...substation.feeders]
        .sort((a, b) => (b.queued_der_mw ?? 0) - (a.queued_der_mw ?? 0))
        .slice(0, LEGS),
    [substation],
  );

  const goTo = (delta: number) => {
    const target = Math.min(legs.length - 1, Math.max(0, legRef.current + delta));
    jumpRef.current = target;
    abortLegRef.current = true;
    flyingRef.current = true;
    setFlying(true);
  };

  useEffect(() => {
    flyingRef.current = flying;
  }, [flying]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goTo(1);
      if (e.key === "ArrowLeft") goTo(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, legs.length]);

  useEffect(() => {
    if (!containerRef.current || !substation.geometry) return;
    cancelledRef.current = false;
    const [lng, lat] = substation.geometry.coordinates;
    let map: any = null;

    const frame = () =>
      new Promise<void>((res) => {
        frameRef.current = requestAnimationFrame(() => res());
      });

    const orbit = async () => {
      const end = ORBIT_ARC / 2;
      map.jumpTo({ center: [lng, lat], bearing: -end, pitch: 58, zoom: 15.4 });
      let easing = false;
      while (map.getBearing() < end - 0.5) {
        if (cancelledRef.current || abortLegRef.current) {
          map.stop();
          return;
        }
        if (flyingRef.current) {
          if (!easing) {
            const cur = map.getBearing();
            const remain = Math.max(200, ((end - cur) / ORBIT_ARC) * ORBIT_MS);
            map.easeTo({ bearing: end, duration: remain, easing: (x: number) => x });
            easing = true;
          }
        } else if (easing) {
          map.stop();
          easing = false;
        }
        await frame();
      }
    };

    const follow = async (path: Path) => {
      map.flyTo({ center: path[0], zoom: 15.6, pitch: 62, duration: 700 });
      const t0 = Date.now();
      while (Date.now() - t0 < 720) {
        if (cancelledRef.current || abortLegRef.current) return;
        await frame();
      }
      let i = 0;
      let t = 0;
      while (i < path.length - 1) {
        if (cancelledRef.current || abortLegRef.current) return;
        if (flyingRef.current) {
          t += SPEED;
          if (t >= 1) {
            t = 0;
            i += 1;
            if (i >= path.length - 1) break;
          }
          const [x1, y1] = path[i];
          const [x2, y2] = path[i + 1];
          const bearing = (Math.atan2(x2 - x1, y2 - y1) * 180) / Math.PI;
          map.jumpTo({
            center: [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t],
            bearing,
            pitch: 62,
            zoom: 15.6,
          });
        }
        await frame();
      }
    };

    ensureMapLibre().then((maplibregl) => {
      if (cancelledRef.current || !containerRef.current) return;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: CARTO_STYLE,
        center: [lng, lat],
        zoom: 15.4,
        pitch: 58,
        bearing: 0,
        canvasContextAttributes: { preserveDrawingBuffer: true },
        attributionControl: { compact: true },
      });

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
          paint: { "line-color": "#6f8fff", "line-width": 12, "line-opacity": 0.25, "line-blur": 6 },
        });
        map.addLayer({
          id: "feeder-line",
          type: "line",
          source: "feeder",
          paint: { "line-color": "#3d5eff", "line-width": 4 },
        });
        new maplibregl.Marker({ color: "#3d5eff", subpixelPositioning: true }).setLngLat([lng, lat]).addTo(map);

        const run = async () => {
          const prefetched = legs.map((leg) =>
            fetch(`/api/feeders/${encodeURIComponent(leg.feeder_id)}`)
              .then((r) => r.json())
              .catch(() => null),
          );
          await new Promise((res) => map.once("idle", res));
          setLabel(`${substation.name} · orbit`);
          await orbit();
          let n = 0;
          while (n < legs.length) {
            if (cancelledRef.current) return;
            if (jumpRef.current != null) {
              n = jumpRef.current;
              jumpRef.current = null;
            }
            abortLegRef.current = false;
            legRef.current = n;
            const leg = legs[n];
            setLabel(`${leg.feeder_id} · feeder ${n + 1} of ${legs.length}`);
            const detail = await prefetched[n];
            if (detail) {
              const path = pathsFromGeometry(detail.geometry);
              if (path.length >= 2) {
                map.getSource("feeder").setData(detail.geometry);
                await follow(path);
              }
            }
            if (jumpRef.current == null) n += 1;
          }
          if (!cancelledRef.current) {
            setLabel(`${substation.name} · tour complete`);
            setFlying(false);
          }
        };
        run();
      });
    });

    return () => {
      cancelledRef.current = true;
      cancelAnimationFrame(frameRef.current);
      if (map) map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [substation, legs]);

  return (
    <div className="tour" role="dialog" aria-label={`3D tour of substation ${substation.name}`}>
      <div ref={containerRef} className="tour-map" />
      <div className="tour-hud">
        <div>
          <span className="eyebrow">3D tour</span>
          <strong>{label}</strong>
        </div>
        <div className="tour-actions">
          <button onClick={() => goTo(-1)} aria-label="Previous feeder" title="Previous feeder">
            &larr;
          </button>
          <button onClick={() => goTo(1)} aria-label="Next feeder" title="Next feeder">
            &rarr;
          </button>
          <button onClick={() => setFlying((f) => !f)}>{flying ? "Pause" : "Resume"}</button>
          <button onClick={onClose}>Exit (Esc)</button>
        </div>
      </div>
    </div>
  );
}
