export interface FeederSummary {
  feeder_id: string;
  substation: string | null;
  friendly_name: string | null;
  hosting_capacity_min_mw: number | null;
  hosting_capacity_max_mw: number | null;
  pv_thermal_mw: number | null;
  queued_der_mw: number | null;
  connected_der_mw: number | null;
  local_voltage_kv: number | null;
  nyiso_load_zone: string | null;
  hc_refresh_date: number | null;
  der_refresh_date: number | null;
  pv_anti_island_mw: number | null;
  pv_bank_rating_mw: number | null;
  pv_feeder_rating_mw: number | null;
  pv_flicker_mw: number | null;
  pv_over_voltage_mw: number | null;
  pv_regulator_deviation_mw: number | null;
  pv_section_mw: number | null;
  pv_voltage_deviation_mw: number | null;
  segment_count: number;
}

export interface FeederDetail extends FeederSummary {
  geometry: GeoJSON.FeatureCollection;
}

export interface HistoryRow {
  feeder_id: string;
  substation: string | null;
  hosting_capacity_min_mw: number | null;
  hosting_capacity_max_mw: number | null;
  pv_thermal_mw: number | null;
  queued_der_mw: number | null;
  connected_der_mw: number | null;
  valid_from: string;
  valid_to: string | null;
}

export interface SubstationSummary {
  name: string;
  connected_mw: number | null;
  queued_mw: number | null;
  feeder_count: number | null;
  geometry_geojson: string | null;
  location_source: "osm" | "estimated" | null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

export interface SubstationFeeder {
  feeder_id: string;
  friendly_name: string | null;
  hosting_capacity_min_mw: number | null;
  hosting_capacity_max_mw: number | null;
  pv_thermal_mw: number | null;
  queued_der_mw: number | null;
  connected_der_mw: number | null;
}

export interface SubstationDetail extends Omit<SubstationSummary, "geometry_geojson"> {
  geometry: { type: string; coordinates: [number, number] } | null;
  feeders: SubstationFeeder[];
}

export type FeederSort = "id" | "capacity" | "queued" | "connected";

export const api = {
  searchFeeders: (q: string, limit = 20, sort: FeederSort = "id") =>
    get<FeederSummary[]>(`/api/feeders?search=${encodeURIComponent(q)}&limit=${limit}&sort=${sort}`),
  getFeeder: (id: string) => get<FeederDetail>(`/api/feeders/${encodeURIComponent(id)}`),
  getHistory: (id: string) => get<HistoryRow[]>(`/api/feeders/${encodeURIComponent(id)}/history`),
  searchSubstations: (q: string, limit = 20) =>
    get<SubstationSummary[]>(`/api/substations?search=${encodeURIComponent(q)}&limit=${limit}`),
  getSubstation: (name: string) =>
    get<SubstationDetail>(`/api/substations/${encodeURIComponent(name)}`),
};
