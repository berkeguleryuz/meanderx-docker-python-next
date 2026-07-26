import { describe, expect, it } from "vitest";
import { explain } from "@/components/GridGuide";
import { FeederDetail } from "@/lib/api";

const feeder = (over: Partial<FeederDetail> = {}): FeederDetail =>
  ({
    feeder_id: "1B1234",
    substation: "BRIDGE ST",
    friendly_name: "Feeder 1",
    hosting_capacity_min_mw: 0,
    hosting_capacity_max_mw: 4,
    pv_thermal_mw: 1,
    queued_der_mw: 0,
    connected_der_mw: 0.5,
    local_voltage_kv: 13.2,
    nyiso_load_zone: "J",
    hc_refresh_date: null,
    der_refresh_date: null,
    pv_anti_island_mw: null,
    pv_bank_rating_mw: null,
    pv_feeder_rating_mw: null,
    pv_flicker_mw: null,
    pv_over_voltage_mw: null,
    pv_regulator_deviation_mw: null,
    pv_section_mw: null,
    pv_voltage_deviation_mw: null,
    segment_count: 10,
    geometry: { type: "FeatureCollection", features: [] },
    ...over,
  }) as FeederDetail;

describe("Grid Guide explain()", () => {
  it("introduces the dataset when nothing is selected", () => {
    const msgs = explain(null);
    expect(msgs.length).toBeGreaterThanOrEqual(2);
    expect(msgs.join(" ")).toContain("Hosting capacity");
  });

  it("computes the percentage of best case", () => {
    const msgs = explain(feeder({ pv_thermal_mw: 1, hosting_capacity_max_mw: 4 }));
    expect(msgs[0]).toContain("25%");
    expect(msgs[0]).toContain("1.00 MW");
  });

  it("warns when the queue exceeds remaining capacity", () => {
    const msgs = explain(feeder({ pv_thermal_mw: 1, queued_der_mw: 2 }));
    expect(msgs.join(" ")).toContain("Careful");
  });

  it("reports an empty queue plainly", () => {
    const msgs = explain(feeder({ queued_der_mw: 0 }));
    expect(msgs.join(" ")).toContain("Nothing is waiting");
  });

  it("never invents numbers when capacity is unpublished", () => {
    const msgs = explain(feeder({ pv_thermal_mw: null }));
    expect(msgs.join(" ")).toContain("no published thermal capacity");
  });
});
