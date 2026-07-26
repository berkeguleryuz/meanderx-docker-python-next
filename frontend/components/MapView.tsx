"use client";
import { useEffect, useRef } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SubstationSummary } from "@/lib/api";

export default function MapView({
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
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    if (geometry && mapRef.current && geometry.features.length > 0) {
      const bounds = L.geoJSON(geometry).getBounds();
      if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [geometry]);

  return (
    <MapContainer
      ref={mapRef}
      center={[40.78, -73.85]}
      zoom={10}
      minZoom={8}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {substations.map((s) => {
        if (!s.geometry_geojson) return null;
        const point = JSON.parse(s.geometry_geojson) as { coordinates: [number, number] };
        const [lng, lat] = point.coordinates;
        const isSelected = s.name === selectedSubstation;
        const estimated = s.location_source === "estimated";
        return (
          <CircleMarker
            key={s.name}
            center={[lat, lng]}
            radius={isSelected ? 10 : 7}
            eventHandlers={onSelectSubstation ? { click: () => onSelectSubstation(s.name) } : {}}
            pathOptions={{
              color: isSelected ? "#f4f6f8" : "#0d0f12",
              weight: 2,
              dashArray: estimated ? "3 3" : undefined,
              fillColor: "#3d5eff",
              fillOpacity: estimated ? 0.55 : 0.9,
            }}
          >
            <Tooltip>
              <strong>{s.name}</strong> substation
              <br />
              {s.feeder_count ?? "?"} feeders
              <br />
              {s.connected_mw?.toFixed(1) ?? "?"} MW connected · {s.queued_mw?.toFixed(1) ?? "?"} MW queued
              <br />
              {estimated ? "Estimated from feeder geometry · click to open" : "Click to open"}
            </Tooltip>
          </CircleMarker>
        );
      })}
      {geometry && geometry.features.length > 0 && (
        <GeoJSON
          key={`${geometry.features.length}-${JSON.stringify(geometry.features[0].geometry).slice(0, 60)}`}
          data={geometry}
          style={{ color: "#3d5eff", weight: 4, opacity: 0.95 }}
        />
      )}
    </MapContainer>
  );
}
