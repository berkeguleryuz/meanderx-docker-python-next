"use client";

/** Horizontal gauge: how much of the feeder's best-case capacity survives its
 *  thermal bottleneck. Fill = pv_thermal / max; the number is the story. */
export default function CapacityGauge({
  value,
  max,
}: {
  value: number | null;
  max: number | null;
}) {
  const pct = value != null && max != null && max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="gauge">
      <div className="gauge-readout">
        <span className="gauge-value">{value == null ? "?" : value.toFixed(2)}</span>
        <span className="gauge-unit">MW available</span>
      </div>
      <div className="gauge-track" role="img" aria-label={`${value ?? 0} of ${max ?? 0} MW`}>
        <div className="gauge-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="gauge-scale">
        <span>thermal bottleneck</span>
        <span>{max == null ? "?" : `${max.toFixed(2)} MW best case`}</span>
      </div>
    </div>
  );
}
