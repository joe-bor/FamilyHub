import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@/lib/types";
import { calculateEventColumns, eventsOverlap } from "./day-lane-layout";

const ev = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: overrides.id ?? "e",
  title: "Event",
  date: new Date(2026, 6, 6),
  startTime: "9:00 AM",
  endTime: "10:00 AM",
  memberId: "m1",
  isAllDay: false,
  source: "NATIVE",
  ...overrides,
});

describe("day-lane-layout", () => {
  it("detects overlapping and non-overlapping events", () => {
    const a = ev({ startTime: "9:00 AM", endTime: "10:00 AM" });
    const b = ev({ startTime: "9:30 AM", endTime: "10:30 AM" });
    const c = ev({ startTime: "10:00 AM", endTime: "11:00 AM" });
    expect(eventsOverlap(a, b)).toBe(true);
    expect(eventsOverlap(a, c)).toBe(false); // touching edges do not overlap
  });

  it("packs non-overlapping events into a single column", () => {
    const result = calculateEventColumns([
      ev({ id: "a", startTime: "9:00 AM", endTime: "10:00 AM" }),
      ev({ id: "b", startTime: "10:00 AM", endTime: "11:00 AM" }),
    ]);
    expect(result.map((e) => e.column)).toEqual([0, 0]);
    expect(result.every((e) => e.totalColumns === 1)).toBe(true);
  });

  it("assigns overlapping events to separate columns", () => {
    const result = calculateEventColumns([
      ev({ id: "a", startTime: "9:00 AM", endTime: "10:30 AM" }),
      ev({ id: "b", startTime: "9:30 AM", endTime: "10:00 AM" }),
    ]);
    expect(result.find((e) => e.id === "a")?.column).toBe(0);
    expect(result.find((e) => e.id === "b")?.column).toBe(1);
    expect(result.every((e) => e.totalColumns === 2)).toBe(true);
  });

  it("returns an empty array for no events", () => {
    expect(calculateEventColumns([])).toEqual([]);
  });
});
