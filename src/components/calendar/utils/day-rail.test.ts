import { describe, expect, it } from "vitest";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import {
  buildMonthMatrix,
  MIN_LANE_WIDTH,
  RAIL_WIDTH,
  railThresholdPx,
  selectMonthDayDots,
} from "./day-rail";

const member = (id: string, color: FamilyMember["color"]): FamilyMember => ({
  id,
  name: id.toUpperCase(),
  color,
});

const ev = (date: Date, memberId: string): CalendarEvent => ({
  id: `${memberId}-${date.getDate()}`,
  title: "E",
  date,
  startTime: "9:00 AM",
  endTime: "10:00 AM",
  memberId,
  isAllDay: false,
  source: "NATIVE",
});

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

  it("builds a 6x7 (or 5x7) month matrix covering the current month", () => {
    const matrix = buildMonthMatrix(new Date(2026, 6, 15)); // July 2026
    expect(matrix.length % 7).toBe(0);
    expect(matrix.some((d) => d.getMonth() === 6 && d.getDate() === 1)).toBe(
      true,
    );
    expect(matrix.some((d) => d.getMonth() === 6 && d.getDate() === 31)).toBe(
      true,
    );
  });

  it("maps each day to its unique member colors (deduped, filtered)", () => {
    const members = [member("m1", "coral"), member("m2", "teal")];
    const july6 = new Date(2026, 6, 6);
    const dots = selectMonthDayDots(
      [ev(july6, "m1"), ev(july6, "m1"), ev(july6, "m2")],
      members,
    );
    expect(dots.get(july6.toDateString())).toEqual(["coral", "teal"]);
  });
});
