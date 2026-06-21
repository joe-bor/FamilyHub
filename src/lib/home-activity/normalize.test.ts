import { describe, expect, it } from "vitest";
import type { CalendarEvent, ListSummary } from "@/lib/types";
import { buildSnapshot } from "./normalize";

const ev = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: "e1",
  title: "Dentist",
  startTime: "9:00 AM",
  endTime: "10:00 AM",
  date: new Date(2026, 5, 23),
  memberId: "m1",
  isAllDay: false,
  ...over,
});
const list = (over: Partial<ListSummary>): ListSummary => ({
  id: "l1",
  name: "Groceries",
  kind: "grocery",
  totalItems: 3,
  completedItems: 1,
  ...over,
});

describe("buildSnapshot", () => {
  it("keys a regular event under calendar:<id> with watched fields", () => {
    const snap = buildSnapshot([ev({})], []);
    expect(snap["calendar:e1"]).toMatchObject({
      module: "calendar",
      title: "Dentist",
      date: "2026-06-23",
      memberId: "m1",
    });
  });

  it("keys an expanded instance (id:null) by recurringEventId + date", () => {
    const snap = buildSnapshot(
      [ev({ id: null, recurringEventId: "r9", date: new Date(2026, 5, 24) })],
      [],
    );
    expect(snap["calendar:r9_2026-06-24"]).toBeDefined();
  });

  it("keys a list under lists:<id> with counts", () => {
    const snap = buildSnapshot([], [list({})]);
    expect(snap["lists:l1"]).toMatchObject({
      module: "lists",
      title: "Groceries",
      totalItems: 3,
      completedItems: 1,
    });
  });

  it("formats endDate and omits it when absent", () => {
    const withEnd = buildSnapshot([ev({ endDate: new Date(2026, 5, 25) })], []);
    expect(withEnd["calendar:e1"].endDate).toBe("2026-06-25");
    const noEnd = buildSnapshot([ev({})], []);
    expect(noEnd["calendar:e1"].endDate).toBeUndefined();
  });
});
