"use client";
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HistoryRow } from "@/lib/api";

export default function HistoryChart({ history }: { history: HistoryRow[] }) {
  if (history.length < 2) {
    return (
      <p className="muted">
        Each data refresh adds a point here. {history.length} snapshot recorded so far; check back
        after the next ingest.
      </p>
    );
  }
  const data = history.map((h) => ({
    date: `${h.valid_from.slice(0, 4)}-${h.valid_from.slice(4, 6)}-${h.valid_from.slice(6, 8)}`,
    capacity: h.pv_thermal_mw,
    queued: h.queued_der_mw,
  }));
  return (
    <ResponsiveContainer width="100%" height={132}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <XAxis dataKey="date" fontSize={10} stroke="#8a919b" tickLine={false} />
        <YAxis fontSize={10} unit=" MW" stroke="#8a919b" tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "#23272e",
            border: "1px solid #31363f",
            borderRadius: 8,
            fontSize: 12,
            color: "#c8cdd3",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="stepAfter" dataKey="capacity" name="Available capacity" stroke="#6f8fff" strokeWidth={2} dot={{ r: 2 }} />
        <Line type="stepAfter" dataKey="queued" name="Queued DER" stroke="#c8cdd3" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
