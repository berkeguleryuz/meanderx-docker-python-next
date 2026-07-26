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
          <p className="muted sub-note">
            Open the Feeders tab to inspect any circuit fed from this substation: its remaining
            hosting capacity, interconnection queue and geometry on the map.
          </p>
        </div>
      )}

      {tab === "feeders" && (
        <div className="tabpane">
          <ul className="feeder-grid">
            {substation.feeders.map((f) => (
              <li key={f.feeder_id} onClick={() => onSelectFeeder(f.feeder_id)}>
                <strong>{f.feeder_id}</strong>
                <span>
                  {f.hosting_capacity_min_mw == null
                    ? "?"
                    : `${f.hosting_capacity_min_mw.toFixed(2)} MW min`}{" "}
                  · {f.queued_der_mw == null ? "?" : `${f.queued_der_mw.toFixed(2)} MW queued`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
