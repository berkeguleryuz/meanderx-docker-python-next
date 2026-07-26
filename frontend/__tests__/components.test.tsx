import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CapacityGauge from "@/components/CapacityGauge";
import HistoryChart from "@/components/HistoryChart";
import { HistoryRow } from "@/lib/api";

describe("CapacityGauge", () => {
  it("shows the value and fills the track proportionally", () => {
    const { container } = render(<CapacityGauge value={1} max={4} />);
    expect(screen.getByText("1.00")).toBeTruthy();
    expect(screen.getByText("4.00 MW best case")).toBeTruthy();
    const fill = container.querySelector(".gauge-fill") as HTMLElement;
    expect(fill.style.width).toBe("25%");
  });

  it("handles missing values without crashing", () => {
    const { container } = render(<CapacityGauge value={null} max={null} />);
    const fill = container.querySelector(".gauge-fill") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("caps the fill at 100%", () => {
    const { container } = render(<CapacityGauge value={9} max={4} />);
    const fill = container.querySelector(".gauge-fill") as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });
});

const row = (valid_from: string): HistoryRow => ({
  feeder_id: "1B1234",
  substation: "BRIDGE ST",
  hosting_capacity_min_mw: 0,
  hosting_capacity_max_mw: 4,
  pv_thermal_mw: 1,
  queued_der_mw: 0,
  connected_der_mw: 0,
  valid_from,
  valid_to: null,
});

describe("HistoryChart", () => {
  it("explains the empty state while only one snapshot exists", () => {
    render(<HistoryChart history={[row("20260724T171058")]} />);
    expect(screen.getByText(/1 snapshot recorded so far/)).toBeTruthy();
  });

  it("renders a chart once two snapshots exist", () => {
    const { container } = render(
      <HistoryChart history={[row("20260601T000000"), row("20260724T171058")]} />,
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
