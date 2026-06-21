import { describe, expect, it } from "vitest";
import type { CalendarEvent, ListSummary } from "@/lib/types";
import { diffSnapshots } from "./diff";
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
const T = 1_000;

describe("diffSnapshots", () => {
  it("reports an added calendar event with a date/time detail", () => {
    const fresh = buildSnapshot([ev({})], []);
    const items = diffSnapshots(fresh, {}, T);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "added",
      module: "calendar",
      title: "Dentist",
      detectedAt: T,
    });
    expect(items[0].detail).toContain("9:00 AM");
  });

  it("reports an edited event when a watched field changes", () => {
    const prev = buildSnapshot([ev({})], []);
    const fresh = buildSnapshot([ev({ startTime: "5:00 PM" })], []);
    const items = diffSnapshots(fresh, prev, T);
    expect(items[0]).toMatchObject({ kind: "edited" });
  });

  it("reports a removed event using the previous title", () => {
    const prev = buildSnapshot([ev({})], []);
    const items = diffSnapshots({}, prev, T);
    expect(items[0]).toMatchObject({ kind: "removed", title: "Dentist" });
  });

  it("ignores unchanged entities", () => {
    const prev = buildSnapshot([ev({})], []);
    const fresh = buildSnapshot([ev({})], []);
    expect(diffSnapshots(fresh, prev, T)).toHaveLength(0);
  });

  it("summarizes list item additions and completions", () => {
    const prev = buildSnapshot(
      [],
      [list({ totalItems: 3, completedItems: 1 })],
    );
    const added = diffSnapshots(
      buildSnapshot([], [list({ totalItems: 6, completedItems: 1 })]),
      prev,
      T,
    );
    expect(added[0].detail).toBe("+3 items");
    const done = diffSnapshots(
      buildSnapshot([], [list({ totalItems: 3, completedItems: 3 })]),
      prev,
      T,
    );
    expect(done[0].detail).toBe("2 checked off");
  });

  it("labels a created list 'New list' (not the doubled title)", () => {
    const items = diffSnapshots(
      buildSnapshot([], [list({ name: "Party" })]),
      {},
      T,
    );
    expect(items[0]).toMatchObject({
      kind: "added",
      title: "Party",
      detail: "New list",
    });
  });

  it("suppresses a bare un-check (completedItems decrease, no other change)", () => {
    const prev = buildSnapshot(
      [],
      [list({ totalItems: 3, completedItems: 2 })],
    );
    const fresh = buildSnapshot(
      [],
      [list({ totalItems: 3, completedItems: 1 })],
    );
    expect(diffSnapshots(fresh, prev, T)).toHaveLength(0);
  });

  it("ignores window-edge churn: an event only outside the overlap is neither added nor removed", () => {
    const overlap = { start: "2026-06-22", end: "2026-07-10" };
    // prev had an event on the 21st (now below the new window's start); fresh has one on the 23rd.
    const prev = buildSnapshot(
      [ev({ id: "old", date: new Date(2026, 5, 21) })],
      [],
    );
    const fresh = buildSnapshot(
      [ev({ id: "new", date: new Date(2026, 5, 23) })],
      [],
    );
    const items = diffSnapshots(fresh, prev, T, overlap);
    // "old" aged out below start → not removed; "new" is inside overlap → added.
    expect(items.map((i) => i.kind)).toEqual(["added"]);
    expect(items[0].title).toBe("Dentist");
  });

  it("detail for an all-day event is 'all day' regardless of startTime", () => {
    const items = diffSnapshots(
      buildSnapshot([ev({ isAllDay: true })], []),
      {},
      T,
    );
    expect(items[0].detail).toBe("all day");
  });

  it("summarizes a list item removal as 'N removed'", () => {
    const prev = buildSnapshot(
      [],
      [list({ totalItems: 3, completedItems: 1 })],
    );
    const fresh = buildSnapshot(
      [],
      [list({ totalItems: 1, completedItems: 1 })],
    );
    expect(diffSnapshots(fresh, prev, T)[0].detail).toBe("2 removed");
  });
});
