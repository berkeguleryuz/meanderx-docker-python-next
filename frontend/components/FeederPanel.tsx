"use client";
import { useEffect, useState } from "react";
import { FeederDetail, HistoryRow } from "@/lib/api";
import CapacityGauge from "./CapacityGauge";
import HistoryChart from "./HistoryChart";

const fmt = (v: number | null) => (v == null ? "?" : `${v.toFixed(2)} MW`);
const fmtDate = (ms: number | null) =>
  ms == null ? "?" : new Date(ms).toISOString().slice(0, 10);

type Tab = "overview" | "screens" | "context";

export default function FeederPanel({
  feeder,
  history,
}: {
  feeder: FeederDetail;
  history: HistoryRow[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  useEffect(() => setTab("overview"), [feeder.feeder_id]);

  const screens: [string, number | null][] = [
    ["Thermal", feeder.pv_thermal_mw],
    ["Section", feeder.pv_section_mw],
    ["Anti-island", feeder.pv_anti_island_mw],
    ["Bank rating", feeder.pv_bank_rating_mw],
    ["Feeder rating", feeder.pv_feeder_rating_mw],
    ["Flicker", feeder.pv_flicker_mw],
    ["Over-voltage", feeder.pv_over_voltage_mw],
    ["Regulator deviation", feeder.pv_regulator_deviation_mw],
    ["Voltage deviation", feeder.pv_voltage_deviation_mw],
  ];
  const binding = screens
    .filter(([, v]) => v != null)
    .sort((a, b) => (a[1] as number) - (b[1] as number))[0];

  return (
    <div className="panel">
      <div className="panel-top">
        <div className="panel-head">
          <span className="eyebrow">Feeder</span>
          <h2>{feeder.feeder_id}</h2>
          <p className="muted">
            {feeder.friendly_name} · fed from <strong>{feeder.substation}</strong>
          </p>
        </div>
        <nav className="tabs" aria-label="Feeder detail sections">
          <button className={tab === "overview" ? "on" : ""} onClick={() => setTab("overview")}>
            Overview
          </button>
          <button className={tab === "screens" ? "on" : ""} onClick={() => setTab("screens")}>
            Screening limits
          </button>
          <button className={tab === "context" ? "on" : ""} onClick={() => setTab("context")}>
            Grid context
          </button>
        </nav>
      </div>

      {tab === "overview" && (
        <div className="tabpane">
          <div className="panel-cols">
            <CapacityGauge value={feeder.pv_thermal_mw} max={feeder.hosting_capacity_max_mw} />

            <dl className="stats">
              <div>
                <dt>Queued DER</dt>
                <dd>{fmt(feeder.queued_der_mw)}</dd>
              </div>
              <div>
                <dt>Connected DER</dt>
                <dd>{fmt(feeder.connected_der_mw)}</dd>
              </div>
              <div>
                <dt>Local hosting range</dt>
                <dd>
                  {fmt(feeder.hosting_capacity_min_mw)} - {fmt(feeder.hosting_capacity_max_mw)}
                </dd>
              </div>
              <div>
                <dt>Segments mapped</dt>
                <dd>{feeder.segment_count}</dd>
              </div>
            </dl>
          </div>

          <div className="history">
            <span className="eyebrow">Change over time</span>
            <HistoryChart history={history} />
          </div>
        </div>
      )}

      {tab === "screens" && (
        <div className="tabpane">
          <p className="muted tab-note">
            Each screen is a different engineering constraint; the lowest one caps interconnection.{" "}
            {binding && (
              <>
                Binding screen: <strong>{binding[0].toLowerCase()}</strong> at {fmt(binding[1])}.
              </>
            )}
          </p>
          <dl className="stats screens">
            {screens.map(([name, v]) => (
              <div key={name} className={binding && name === binding[0] ? "binding" : ""}>
                <dt>{name}</dt>
                <dd>{fmt(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {tab === "context" && (
        <div className="tabpane">
          <dl className="stats ctx">
            <div>
              <dt>Local voltage</dt>
              <dd>{feeder.local_voltage_kv == null ? "?" : `${feeder.local_voltage_kv} kV`}</dd>
            </div>
            <div>
              <dt>NYISO load zone</dt>
              <dd>{feeder.nyiso_load_zone ?? "?"}</dd>
            </div>
            <div>
              <dt>Capacity refreshed</dt>
              <dd>{fmtDate(feeder.hc_refresh_date)}</dd>
            </div>
            <div>
              <dt>Queue refreshed</dt>
              <dd>{fmtDate(feeder.der_refresh_date)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
