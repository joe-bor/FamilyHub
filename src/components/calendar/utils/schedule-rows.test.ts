import { describe, expect, it } from "vitest";
import { createTestEvent, testMembers } from "@/test/fixtures";
import { buildScheduleRows, hasScheduleWindowEvents } from "./schedule-rows";

const d = (day: number) => new Date(2026, 2, day);
const filter = {
  selectedMembers: testMembers.map((m) => m.id),
  showAllDayEvents: true,
};
const at = (day: number, title = `E${day}`) =>
  createTestEvent({
    id: title,
    title,
    date: d(day),
    memberId: testMembers[0].id,
  });

describe("buildScheduleRows", () => {
  it("emits a day row per populated day", () => {
    const rows = buildScheduleRows({
      events: [at(8), at(9)],
      startDate: d(8),
      dayCount: 2,
      filter,
    });

    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.kind === "day")).toBe(true);
  });

  it("collapses a run of empty days into one gap row", () => {
    const rows = buildScheduleRows({
      events: [at(8), at(13)],
      startDate: d(8),
      dayCount: 14,
      filter,
    });

    const gaps = rows.filter((r) => r.kind === "gap");
    expect(gaps).toHaveLength(2); // 9-12, then 14-21
    expect(gaps[0]).toMatchObject({ start: d(9), end: d(12) });
  });

  it("emits a gap row for a single empty day", () => {
    const rows = buildScheduleRows({
      events: [at(8), at(10)],
      startDate: d(8),
      dayCount: 3,
      filter,
    });

    expect(rows[1]).toMatchObject({ kind: "gap", start: d(9), end: d(9) });
  });

  it("emits a leading gap when the window opens empty", () => {
    const rows = buildScheduleRows({
      events: [at(10)],
      startDate: d(8),
      dayCount: 3,
      filter,
    });

    expect(rows[0]).toMatchObject({ kind: "gap", start: d(8), end: d(9) });
  });

  it("clips a trailing gap to the window", () => {
    const rows = buildScheduleRows({
      events: [at(8)],
      startDate: d(8),
      dayCount: 3,
      filter,
    });

    expect(rows[1]).toMatchObject({ kind: "gap", start: d(9), end: d(10) });
  });

  it("returns no rows when the whole window is empty", () => {
    // The caller renders the whole-view empty state in this case rather than
    // one 14-day gap row. See spec Section 5.2.
    expect(
      buildScheduleRows({ events: [], startDate: d(8), dayCount: 14, filter }),
    ).toHaveLength(0);
  });

  it("treats filtered-out events as empty days", () => {
    const rows = buildScheduleRows({
      events: [at(9)],
      startDate: d(8),
      dayCount: 2,
      filter: { selectedMembers: [], showAllDayEvents: true },
    });

    expect(rows).toHaveLength(0);
  });

  it("detects raw events only inside the rendered window", () => {
    expect(hasScheduleWindowEvents([at(21)], d(8), 14)).toBe(true);
    // Offset 14 is fetched by the existing inclusive query but not rendered.
    expect(hasScheduleWindowEvents([at(22)], d(8), 14)).toBe(false);
  });
});
