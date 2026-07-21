import { describe, expect, it } from "vitest";
import { MIN_LANE_WIDTH, RAIL_WIDTH, railThresholdPx } from "./day-rail";

describe("day-rail math", () => {
  it("threshold grows with member count and accounts for the desktop nav", () => {
    expect(railThresholdPx(3)).toBeLessThan(railThresholdPx(6));
    // 3 comfortable lanes + axis + rail + the 80px desktop nav fit a ~13" laptop
    // (~1280) but need more than a bare 1024...
    expect(railThresholdPx(3)).toBeGreaterThan(1024);
    expect(railThresholdPx(3)).toBeLessThanOrEqual(1120);
    // ...and 6 lanes must not fit until well past 1440 (rail yields width to lanes).
    expect(railThresholdPx(6)).toBeGreaterThan(1440);
  });

  it("uses the documented lane/rail widths", () => {
    expect(RAIL_WIDTH).toBe(300);
    expect(MIN_LANE_WIDTH).toBeGreaterThanOrEqual(160);
  });
});
