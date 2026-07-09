import { describe, expect, it } from "vitest";
import { CALENDAR_START_HOUR } from "@/lib/time-utils";
import {
  DEFAULT_HOUR_ROW_HEIGHT,
  DENSE_HOUR_ROW_HEIGHT,
  earliestEventStartMinutes,
  getEventOffsets,
  hourRowHeightFor,
  minutesFromStartHour,
  pxFromOffsets,
  TIME_SLOTS,
} from "./hour-grid";

describe("hour-grid geometry", () => {
  it("exposes the 6 AM-11 PM slot labels", () => {
    expect(TIME_SLOTS).toHaveLength(18);
    expect(TIME_SLOTS[0]).toBe("6 AM");
    expect(TIME_SLOTS.at(-1)).toBe("11 PM");
  });

  it("picks the dense row height only on large screens", () => {
    expect(hourRowHeightFor(false)).toBe(DEFAULT_HOUR_ROW_HEIGHT);
    expect(hourRowHeightFor(true)).toBe(DENSE_HOUR_ROW_HEIGHT);
    expect(DENSE_HOUR_ROW_HEIGHT).toBeLessThan(DEFAULT_HOUR_ROW_HEIGHT);
  });

  it("computes event offsets in hours from the start hour", () => {
    // 9:00 AM-10:30 AM with a 6 AM start hour -> starts 3h in, spans 1.5h
    expect(getEventOffsets("9:00 AM", "10:30 AM")).toEqual({
      startOffsetHours: 3,
      spanHours: 1.5,
    });
  });

  it("converts offsets to pixels with a per-row height and a minimum", () => {
    expect(pxFromOffsets({ startOffsetHours: 3, spanHours: 1 }, 52)).toEqual({
      top: 156,
      height: 52,
    });
    // A 10-minute event never collapses below the 30px minimum.
    expect(
      pxFromOffsets({ startOffsetHours: 0, spanHours: 10 / 60 }, 52).height,
    ).toBe(30);
  });

  it("converts a time string to minutes from the start hour", () => {
    expect(minutesFromStartHour("6:00 AM", CALENDAR_START_HOUR)).toBe(0);
    expect(minutesFromStartHour("9:30 AM", CALENDAR_START_HOUR)).toBe(210);
  });

  it("finds the earliest timed-event start, ignoring all-day, or null", () => {
    const base = {
      date: new Date(2026, 6, 6),
      memberId: "m1",
      isAllDay: false,
    };
    expect(
      earliestEventStartMinutes(
        [
          { ...base, startTime: "2:00 PM", endTime: "3:00 PM" },
          { ...base, startTime: "8:15 AM", endTime: "9:00 AM" },
          {
            ...base,
            isAllDay: true,
            startTime: "12:00 AM",
            endTime: "12:00 AM",
          },
        ],
        CALENDAR_START_HOUR,
      ),
    ).toBe(135); // 8:15 AM = 2h15m after 6 AM
    expect(earliestEventStartMinutes([], CALENDAR_START_HOUR)).toBeNull();
  });
});
