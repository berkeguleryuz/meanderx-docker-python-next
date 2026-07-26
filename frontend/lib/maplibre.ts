/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    maplibregl?: any;
  }
}

export const CARTO_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

let loader: Promise<any> | null = null;

export function ensureMapLibre(): Promise<any> {
  if (typeof window !== "undefined" && window.maplibregl) return Promise.resolve(window.maplibregl);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/vendor/maplibre-gl.css";
      document.head.appendChild(link);
      const script = document.createElement("script");
      script.src = "/vendor/maplibre-gl.js";
      script.onload = () => resolve(window.maplibregl);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return loader;
}

export function addBuildings(map: any) {
  try {
    const building = map.getStyle().layers?.find((l: any) => l.id.includes("building"));
    if (building && building.source) {
      map.addLayer({
        id: "bld-extrusion",
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
}
