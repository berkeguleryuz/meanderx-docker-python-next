"use client";
import { useEffect, useState } from "react";
import { api, FeederSummary, SubstationSummary } from "@/lib/api";

export default function SearchBox({
  onSelectFeeder,
  onSelectSubstation,
}: {
  onSelectFeeder: (id: string) => void;
  onSelectSubstation: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [feeders, setFeeders] = useState<FeederSummary[]>([]);
  const [subs, setSubs] = useState<SubstationSummary[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (q.length < 2) {
      setFeeders([]);
      setSubs([]);
      setSearched(false);
      return;
    }
    const t = setTimeout(
      () =>
        Promise.all([api.searchFeeders(q, 12), api.searchSubstations(q, 6)])
          .then(([f, s]) => {
            setFeeders(f);
            setSubs(s);
            setSearched(true);
          })
          .catch(() => {
            setFeeders([]);
            setSubs([]);
            setSearched(true);
          }),
      250,
    );
    return () => clearTimeout(t);
  }, [q]);

  const clear = () => {
    setQ("");
    setFeeders([]);
    setSubs([]);
    setSearched(false);
  };

  const empty = searched && feeders.length === 0 && subs.length === 0;

  return (
    <div className="searchbox">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a feeder or substation"
      />
      {empty && (
        <p className="no-results">
          Nothing matches “{q}”. This dataset covers <strong>Con Edison&apos;s New York service
          territory</strong>, so search by feeder ID, circuit name or substation name, not by city.
        </p>
      )}
      {(feeders.length > 0 || subs.length > 0) && (
        <ul>
          {subs.length > 0 && <li className="group">Substations</li>}
          {subs.map((s) => (
            <li
              key={`s-${s.name}`}
              onClick={() => {
                onSelectSubstation(s.name);
                clear();
              }}
            >
              <strong>{s.name}</strong> · {s.feeder_count ?? "?"} feeders ·{" "}
              {s.queued_mw?.toFixed(1) ?? "?"} MW queued
            </li>
          ))}
          {feeders.length > 0 && <li className="group">Feeders</li>}
          {feeders.map((f) => (
            <li
              key={`f-${f.feeder_id}`}
              onClick={() => {
                onSelectFeeder(f.feeder_id);
                clear();
              }}
            >
              <strong>{f.feeder_id}</strong> · {f.friendly_name ?? "?"} ({f.substation ?? "?"})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
