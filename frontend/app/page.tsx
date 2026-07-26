"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import SearchBox from "@/components/SearchBox";
import FeederPanel from "@/components/FeederPanel";
import SubstationPanel from "@/components/SubstationPanel";
import GridGuide from "@/components/GridGuide";
import {
  api,
  FeederDetail,
  FeederSort,
  FeederSummary,
  HistoryRow,
  SubstationDetail,
  SubstationSummary,
} from "@/lib/api";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
const Tour3D = dynamic(() => import("@/components/Tour3D"), { ssr: false });
const MapView3D = dynamic(() => import("@/components/MapView3D"), { ssr: false });
const SubstationTour3D = dynamic(() => import("@/components/SubstationTour3D"), { ssr: false });

const SORTS: { key: FeederSort; label: string }[] = [
  { key: "capacity", label: "Capacity" },
  { key: "queued", label: "Queued" },
  { key: "connected", label: "Connected" },
  { key: "id", label: "A-Z" },
];

const metric = (f: FeederSummary, sort: FeederSort) => {
  const v =
    sort === "queued"
      ? f.queued_der_mw
      : sort === "connected"
        ? f.connected_der_mw
        : f.pv_thermal_mw;
  return v == null ? "?" : `${v.toFixed(2)} MW`;
};

export default function Home() {
  const [feeder, setFeeder] = useState<FeederDetail | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [substations, setSubstations] = useState<SubstationSummary[]>([]);
  const [feeders, setFeeders] = useState<FeederSummary[]>([]);
  const [substation, setSubstation] = useState<SubstationDetail | null>(null);
  const [view, setView] = useState<"feeders" | "substations">("substations");
  const [subSort, setSubSort] = useState<"queued" | "connected" | "feeders" | "id">("connected");
  const [sort, setSort] = useState<FeederSort>("capacity");
  const [tour, setTour] = useState(false);
  const [mapMode, setMapMode] = useState<"3d" | "2d">("3d");
  const [subTour, setSubTour] = useState(false);

  useEffect(() => {
    api.searchSubstations("", 50).then(setSubstations).catch(() => {});
  }, []);

  useEffect(() => {
    api.searchFeeders("", 1100, sort).then(setFeeders).catch(() => {});
  }, [sort]);

  const select = async (id: string) => {
    try {
      setError(null);
      const [f, h] = await Promise.all([api.getFeeder(id), api.getHistory(id)]);
      setFeeder(f);
      setHistory(h);
    } catch (e) {
      setError(String(e));
    }
  };

  const selectSubstation = async (name: string) => {
    try {
      setError(null);
      setFeeder(null);
      setSubstation(await api.getSubstation(name));
    } catch (e) {
      setError(String(e));
    }
  };

  const rowPct = (v: number | null | undefined, max: number) =>
    v != null && max > 0 ? Math.min(100, (v / max) * 100) : 0;
  const metricNum = (f: FeederSummary, k: FeederSort) =>
    k === "queued" ? f.queued_der_mw : k === "connected" ? f.connected_der_mw : f.pv_thermal_mw;
  const subMetric = (s: SubstationSummary) =>
    subSort === "connected" ? s.connected_mw : subSort === "feeders" ? s.feeder_count : s.queued_mw;
  const feederMax = Math.max(0, ...feeders.map((f) => metricNum(f, sort) ?? 0));
  const subsSorted =
    subSort === "id"
      ? [...substations].sort((a, b) => a.name.localeCompare(b.name))
      : [...substations].sort((a, b) => (subMetric(b) ?? 0) - (subMetric(a) ?? 0));
  const subMax = Math.max(0, ...substations.map((s) => subMetric(s) ?? 0));

  return (
    <main className="layout">
      <aside>
        <header className="masthead">
          <span className="eyebrow">Con Edison · Network PV</span>
          <h1>Hosting Capacity Explorer</h1>
        </header>
        <SearchBox onSelectFeeder={select} onSelectSubstation={selectSubstation} />
        {error && <p className="error">{error}</p>}

        <nav className="tabs viewswitch" aria-label="Browse mode">
          <button
            className={view === "substations" ? "on" : ""}
            onClick={() => setView("substations")}
          >
            Substations ({substations.length || "…"})
          </button>
          <button className={view === "feeders" ? "on" : ""} onClick={() => setView("feeders")}>
            Feeders ({feeders.length || "…"})
          </button>
        </nav>

        {view === "feeders" && (
          <div className="browse">
            <div className="sortbar">
              <span className="eyebrow">Sort by</span>
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  className={`chip ${sort === s.key ? "on" : ""}`}
                  onClick={() => setSort(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <ul>
              {feeders.map((f) => (
                <li
                  key={f.feeder_id}
                  className={feeder?.feeder_id === f.feeder_id ? "active" : ""}
                  onClick={() => select(f.feeder_id)}
                >
                  <div className="row-main">
                    <strong>{f.feeder_id}</strong>
                    <span>{f.substation ?? "?"}</span>
                  </div>
                  <span className="row-val">{metric(f, sort)}</span>
                  <div className="row-track">
                    <div
                      className="fg-fill"
                      style={{ width: `${rowPct(metricNum(f, sort), feederMax)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {view === "substations" && (
          <div className="browse">
            <div className="sortbar">
              <span className="eyebrow">Sort by</span>
              {(
                [
                  ["connected", "Connected"],
                  ["queued", "Queued"],
                  ["feeders", "Feeders"],
                  ["id", "A-Z"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={`chip ${subSort === key ? "on" : ""}`}
                  onClick={() => setSubSort(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <ul>
              {subsSorted.map((s) => (
                <li
                  key={s.name}
                  className={substation?.name === s.name ? "active" : ""}
                  onClick={() => selectSubstation(s.name)}
                >
                  <div className="row-main">
                    <strong>{s.name}</strong>
                    <span>
                      {s.feeder_count ?? "?"} feeders ·{" "}
                      {subSort === "connected"
                        ? `${s.queued_mw?.toFixed(1) ?? "?"} MW queued`
                        : `${s.connected_mw?.toFixed(1) ?? "?"} MW connected`}
                    </span>
                  </div>
                  <span className="row-val">
                    {subSort === "feeders"
                      ? `${s.feeder_count ?? "?"}`
                      : `${(subMetric(s) as number | null)?.toFixed(1) ?? "?"} MW`}
                  </span>
                  <div className="row-track">
                    <div
                      className="fg-fill"
                      style={{ width: `${rowPct(subMetric(s), subMax)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
      <section className="map">
        {mapMode === "3d" ? (
          <MapView3D
            geometry={feeder?.geometry ?? null}
            substations={substations}
            selectedSubstation={substation?.name ?? null}
            onSelectSubstation={selectSubstation}
          />
        ) : (
          <MapView
            geometry={feeder?.geometry ?? null}
            substations={substations}
            selectedSubstation={substation?.name ?? null}
            onSelectSubstation={selectSubstation}
          />
        )}
        <nav className="tabs map-mode" aria-label="Map mode">
          <button className={mapMode === "3d" ? "on" : ""} onClick={() => setMapMode("3d")}>
            3D
          </button>
          <button className={mapMode === "2d" ? "on" : ""} onClick={() => setMapMode("2d")}>
            2D
          </button>
        </nav>
        {feeder && (
          <div className="sheet" role="dialog" aria-label={`Feeder ${feeder.feeder_id}`}>
            <div className="sheet-grip" aria-hidden="true" />
            <div className="sheet-bar">
              <button className="sheet-back" onClick={() => setFeeder(null)}>
                &larr; {substation ? substation.name : "All feeders"}
              </button>
              <button className="tour-open" onClick={() => setTour(true)}>
                3D tour
              </button>
              <button
                className="sheet-close"
                onClick={() => {
                  setFeeder(null);
                  setSubstation(null);
                }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <FeederPanel feeder={feeder} history={history} />
          </div>
        )}
        {!feeder && substation && (
          <div className="sheet" role="dialog" aria-label={`Substation ${substation.name}`}>
            <div className="sheet-grip" aria-hidden="true" />
            <div className="sheet-bar">
              <button className="sheet-back" onClick={() => setSubstation(null)}>
                &larr; All substations
              </button>
              {substation.geometry && (
                <button className="tour-open" onClick={() => setSubTour(true)}>
                  3D tour
                </button>
              )}
              <button className="sheet-close" onClick={() => setSubstation(null)} aria-label="Close">
                &times;
              </button>
            </div>
            <SubstationPanel substation={substation} onSelectFeeder={select} />
          </div>
        )}
        <GridGuide feeder={feeder} />
        {tour && feeder && <Tour3D feeder={feeder} onClose={() => setTour(false)} />}
        {subTour && substation && (
          <SubstationTour3D substation={substation} onClose={() => setSubTour(false)} />
        )}
      </section>
    </main>
  );
}
