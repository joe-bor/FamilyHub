import { describe, expect, it } from "vitest";
import { createTestEvent, testMembers } from "@/test/fixtures";
import {
  isMultiDay,
  multiDayEdge,
  orderRowMultiDay,
  planCellSlots,
} from "./month-slots";

const d = (day: number) => new Date(2026, 2, day); // March 2026
const weekOne = [1, 2, 3, 4, 5, 6, 7].map(d);

const trip = (title: string, from: number, to: number) =>
  createTestEvent({
    id: title,
    title,
    date: d(from),
    endDate: d(to),
    isAllDay: true,
    memberId: testMembers[0].id,
  });

const single = (title: string, day: number, startTime = "9:00 AM") =>
  createTestEvent({ id: title, title, date: d(day), startTime });

describe("isMultiDay", () => {
  it("is true when endDate is after date", () => {
    expect(isMultiDay(trip("Spring break", 2, 6))).toBe(true);
  });

  it("is false with no endDate", () => {
    expect(isMultiDay(single("Piano", 3))).toBe(false);
  });

  it("is false when endDate equals date", () => {
    expect(isMultiDay(trip("One day", 3, 3))).toBe(false);
  });
});

describe("multiDayEdge", () => {
  const run = trip("Spring break", 2, 6);

  it("marks the true start", () => {
    expect(multiDayEdge(run, d(2))).toBe("start");
  });

  it("marks interior days", () => {
    expect(multiDayEdge(run, d(4))).toBe("middle");
  });

  it("marks the true end", () => {
    expect(multiDayEdge(run, d(6))).toBe("end");
  });

  it("marks a single-day event solo", () => {
    expect(multiDayEdge(single("Piano", 3), d(3))).toBe("solo");
  });

  it("keeps a middle edge at a week boundary", () => {
    // Sat 14 is the last cell of its row but not the run's end, so it must
    // stay square-edged for the weld to continue into the next row.
    const acrossBoundary = trip("Grandma visits", 11, 16);
    expect(multiDayEdge(acrossBoundary, d(14))).toBe("middle");
    expect(multiDayEdge(acrossBoundary, d(15))).toBe("middle");
    expect(multiDayEdge(acrossBoundary, d(16))).toBe("end");
  });
});

describe("orderRowMultiDay", () => {
  it("orders by start ascending, then end descending, then title", () => {
    const later = trip("Later", 4, 5);
    const earlyShort = trip("Early short", 2, 3);
    const earlyLong = trip("Early long", 2, 6);

    expect(
      orderRowMultiDay([later, earlyShort, earlyLong], weekOne).map(
        (e) => e.title,
      ),
    ).toEqual(["Early long", "Early short", "Later"]);
  });

  it("excludes single-day events", () => {
    expect(
      orderRowMultiDay([single("Piano", 3), trip("Trip", 2, 4)], weekOne).map(
        (e) => e.title,
      ),
    ).toEqual(["Trip"]);
  });

  it("excludes runs that do not touch the row", () => {
    expect(orderRowMultiDay([trip("Far", 20, 24)], weekOne)).toHaveLength(0);
  });
});

describe("planCellSlots", () => {
  it("places a lone run at slot 0 on every day it covers", () => {
    const run = trip("Spring break", 2, 6);
    const rowMultiDay = orderRowMultiDay([run], weekOne);

    for (const day of [2, 3, 4, 5, 6]) {
      const plan = planCellSlots({
        rowMultiDay,
        day: d(day),
        singleDayEvents: [],
        capacity: 4,
      });
      expect(plan.slots[0]).toMatchObject({ kind: "event" });
      expect(plan.slots[0].event?.title).toBe("Spring break");
    }
  });

  it("keeps 3 overlapping runs in stable slots across every covered cell", () => {
    const runs = [
      trip("Outer", 1, 7),
      trip("Middle", 2, 6),
      trip("Inner", 3, 5),
    ];
    const rowMultiDay = orderRowMultiDay(runs, weekOne);

    for (const [expectedSlot, run] of runs.entries()) {
      const start = run.date.getDate();
      const end = run.endDate?.getDate() ?? start;
      for (let day = start; day <= end; day++) {
        const plan = planCellSlots({
          rowMultiDay,
          day: d(day),
          singleDayEvents: [],
          capacity: 4,
        });
        expect(plan.slots.findIndex((slot) => slot.event?.id === run.id)).toBe(
          expectedSlot,
        );
      }
    }
  });

  it("reserves a blank slot above a lower-ordered run", () => {
    const first = trip("First", 2, 3);
    const second = trip("Second", 4, 6);
    const rowMultiDay = orderRowMultiDay([first, second], weekOne);

    // Mar 5 is covered by Second (index 1) but not First (index 0).
    const plan = planCellSlots({
      rowMultiDay,
      day: d(5),
      singleDayEvents: [],
      capacity: 4,
    });

    expect(plan.slots[0]).toMatchObject({ kind: "blank" });
    expect(plan.slots[1].event?.title).toBe("Second");
  });

  it("reserves nothing on a day no run covers", () => {
    const rowMultiDay = orderRowMultiDay([trip("Trip", 2, 3)], weekOne);
    const plan = planCellSlots({
      rowMultiDay,
      day: d(6),
      singleDayEvents: [single("Dentist", 6)],
      capacity: 4,
    });

    expect(plan.slots).toHaveLength(1);
    expect(plan.slots[0].event?.title).toBe("Dentist");
  });

  it("never exceeds capacity even when blanks are reserved", () => {
    const first = trip("First", 2, 3);
    const second = trip("Second", 4, 6);
    const rowMultiDay = orderRowMultiDay([first, second], weekOne);

    // Mar 5 needs slot 0 blank + slot 1 for Second, plus two singles = 4 slots
    // in a 3-slot cell. A naive eventCount comparison (3 events <= 3 capacity)
    // would render all of them and overflow the cell.
    const plan = planCellSlots({
      rowMultiDay,
      day: d(5),
      singleDayEvents: [single("A", 5), single("B", 5, "10:00 AM")],
      capacity: 3,
    });

    expect(plan.slots.length).toBeLessThanOrEqual(3);
  });

  it("counts only events in the overflow total, never blanks", () => {
    const first = trip("First", 2, 3);
    const second = trip("Second", 4, 6);
    const rowMultiDay = orderRowMultiDay([first, second], weekOne);

    const plan = planCellSlots({
      rowMultiDay,
      day: d(5),
      singleDayEvents: [single("A", 5), single("B", 5, "10:00 AM")],
      capacity: 3,
    });

    // Rendered: slot 0 blank, slot 1 "Second". Hidden: A and B.
    expect(plan.slots).toHaveLength(2);
    expect(plan.overflowCount).toBe(2);
  });

  it("documents the reserved-lane overflow-only edge case", () => {
    const first = trip("First", 2, 3);
    const second = trip("Second", 4, 6);
    const rowMultiDay = orderRowMultiDay([first, second], weekOne);

    // Mar 5 needs [blank, Second, Single]. At capacity 2 the final visual slot
    // is the +N summary, so exact lane alignment deliberately leaves no event
    // chip visible. The gridcell count and full-day popover remain complete.
    const plan = planCellSlots({
      rowMultiDay,
      day: d(5),
      singleDayEvents: [single("Single", 5)],
      capacity: 2,
    });

    expect(plan.slots).toEqual([{ kind: "blank" }]);
    expect(plan.overflowCount).toBe(2);
  });

  it("reports no overflow when everything fits", () => {
    const plan = planCellSlots({
      rowMultiDay: [],
      day: d(3),
      singleDayEvents: [single("A", 3), single("B", 3, "10:00 AM")],
      capacity: 4,
    });

    expect(plan.slots).toHaveLength(2);
    expect(plan.overflowCount).toBe(0);
  });
});
