"use client";
import { useEffect, useState } from "react";
import { SubstationDetail } from "@/lib/api";

const fmt = (v: number | null) => (v == null ? "?" : `${v.toFixed(1)} MW`);

type Tab = "overview" | "feeders";

export default function SubstationPanel({
  substation,
  onSelectFeeder,
}: {
  substation: SubstationDetail;
  onSelectFeeder: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  useEffect(() => setTab("overview"), [substation.name]);


  const headroom = substation.feeders.filter(
    (f) => (f.hosting_capacity_min_mw ?? 0) > 0,
  ).length;

  return (
    <div className="panel">
      <div className="panel-top">
        <div className="panel-head">
          <span className="eyebrow">Substation</span>
          <h2>{substation.name}</h2>
          <p className="muted">
            {substation.geometry == null
              ? "no location available"
              : (substation as unknown as { location_source?: string }).location_source === "osm"
                ? "located via OpenStreetMap"
                : "location estimated from its feeders' geometry"}
          </p>
        </div>
        <nav className="tabs" aria-label="Substation detail sections">
          <button className={tab === "overview" ? "on" : ""} onClick={() => setTab("overview")}>
            Overview
          </button>
          <button className={tab === "feeders" ? "on" : ""} onClick={() => setTab("feeders")}>
            Feeders ({substation.feeders.length})
          </button>
        </nav>
      </div>

      {tab === "overview" && (
        <div className="tabpane">
          <dl className="stats sub-stats">
            <div>
              <dt>Feeders</dt>
              <dd>{substation.feeder_count ?? substation.feeders.length}</dd>
            </div>
            <div>
              <dt>DG in queue</dt>
              <dd>{fmt(substation.queued_mw)}</dd>
            </div>
            <div>
              <dt>DG connected</dt>
              <dd>{fmt(substation.connected_mw)}</dd>
            </div>
            <div>
              <dt>Feeders with headroom</dt>
              <dd>
                {headroom} of {substation.feeders.length}
              </dd>
            </div>
          </dl>
          <div className="legends">
            {(
              [
                ["Top feeders · connected DER", (f: typeof substation.feeders[number]) => f.connected_der_mw],
                ["Top feeders · queued DER", (f: typeof substation.feeders[number]) => f.queued_der_mw],
              ] as const
            ).map(([title, pick]) => {
              const ranked = [...substation.feeders]
                .filter((f) => (pick(f) ?? 0) > 0)
                .sort((a, b) => (pick(b) ?? 0) - (pick(a) ?? 0))
                .slice(0, 5);
              const total = substation.feeders.reduce((acc, f) => acc + (pick(f) ?? 0), 0);
              const top = ranked[0] ? (pick(ranked[0]) ?? 0) : 0;
              return (
                <div className="legend" key={title}>
                  <span className="eyebrow">{title}</span>
                  {ranked.length === 0 && <p className="muted">No MW recorded yet.</p>}
                  <ul>
                    {ranked.map((f) => {
                      const v = pick(f) ?? 0;
                      return (
                        <li key={f.feeder_id} onClick={() => onSelectFeeder(f.feeder_id)}>
                          <div className="legend-row">
                            <svg className="legend-glyph" viewBox="0 0 16 16" aria-hidden="true">
                              <path d="M9.4 1 3.8 9.2h3.4L6.4 15l5.8-8.4H8.6L9.4 1Z" />
                            </svg>
                            <strong>{f.feeder_id}</strong>
                            <em>
                              {v.toFixed(2)} MW
                              <b>{total > 0 ? ` ${Math.round((v / total) * 100)}%` : ""}</b>
                            </em>
                          </div>
                          <div className="fg-track">
                            <div className="fg-fill" style={{ width: `${top > 0 ? (v / top) * 100 : 0}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "feeders" && (
        <div className="tabpane">
          <ul className="feeder-grid">
            {substation.feeders.map((f) => {
              const avail = f.pv_thermal_mw;
              const max = f.hosting_capacity_max_mw;
              const pct = avail != null && max != null && max > 0 ? Math.min(100, (avail / max) * 100) : 0;
              return (
                <li key={f.feeder_id} onClick={() => onSelectFeeder(f.feeder_id)}>
                  <div className="fg-head">
                    <strong>{f.feeder_id}</strong>
                    <em>
                      {avail == null ? "?" : `${avail.toFixed(2)} MW`}
                      <b>{max != null && max > 0 ? ` ${Math.round(pct)}%` : ""}</b>
                    </em>
                  </div>
                  <div className="fg-track">
                    <div className="fg-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span>
                    {f.connected_der_mw == null ? "?" : `${f.connected_der_mw.toFixed(2)} MW connected`} ·{" "}
                    {f.queued_der_mw == null ? "?" : `${f.queued_der_mw.toFixed(2)} MW queued`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
