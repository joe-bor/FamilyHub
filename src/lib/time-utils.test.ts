import { describe, expect, it } from "vitest";
import {
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  compareEventsByTime,
  DEFAULT_EVENT_HOUR,
  format12hTo24h,
  format24hTo12h,
  formatLocalDate,
  getSmartDefaultTimes,
  getTimeInMinutes,
  parseLocalDate,
  parseTime,
} from "./time-utils";

describe("time-utils", () => {
  describe("parseTime", () => {
    it("parses AM times correctly", () => {
      expect(parseTime("9:30 AM")).toEqual({ hours: 9, minutes: 30 });
    });

    it("parses PM times correctly", () => {
      expect(parseTime("2:00 PM")).toEqual({ hours: 14, minutes: 0 });
    });

    it("parses single-digit hours", () => {
      expect(parseTime("1:15 AM")).toEqual({ hours: 1, minutes: 15 });
      expect(parseTime("3:45 PM")).toEqual({ hours: 15, minutes: 45 });
    });

    it("handles midnight edge case (12:00 AM)", () => {
      expect(parseTime("12:00 AM")).toEqual({ hours: 0, minutes: 0 });
    });

    it("handles noon edge case (12:00 PM)", () => {
      expect(parseTime("12:00 PM")).toEqual({ hours: 12, minutes: 0 });
    });

    it("handles 12:30 AM correctly", () => {
      expect(parseTime("12:30 AM")).toEqual({ hours: 0, minutes: 30 });
    });

    it("handles 12:30 PM correctly", () => {
      expect(parseTime("12:30 PM")).toEqual({ hours: 12, minutes: 30 });
    });

    it("is case-insensitive for AM/PM", () => {
      expect(parseTime("9:30 am")).toEqual({ hours: 9, minutes: 30 });
      expect(parseTime("2:00 pm")).toEqual({ hours: 14, minutes: 0 });
      expect(parseTime("9:30 Am")).toEqual({ hours: 9, minutes: 30 });
      expect(parseTime("2:00 Pm")).toEqual({ hours: 14, minutes: 0 });
    });

    it("returns {hours: 0, minutes: 0} for invalid input", () => {
      expect(parseTime("invalid")).toEqual({ hours: 0, minutes: 0 });
      expect(parseTime("")).toEqual({ hours: 0, minutes: 0 });
      expect(parseTime("25:00 AM")).toEqual({ hours: 25, minutes: 0 }); // Note: no validation
    });

    it("handles times with extra whitespace", () => {
      // Regex uses \s* which matches zero or more whitespace
      expect(parseTime("9:30  AM")).toEqual({ hours: 9, minutes: 30 });
      expect(parseTime("9:30   AM")).toEqual({ hours: 9, minutes: 30 });
    });
  });

  describe("getTimeInMinutes", () => {
    it("converts morning times correctly", () => {
      expect(getTimeInMinutes("6:00 AM")).toBe(360); // 6 * 60
      expect(getTimeInMinutes("9:30 AM")).toBe(570); // 9 * 60 + 30
      expect(getTimeInMinutes("11:45 AM")).toBe(705); // 11 * 60 + 45
    });

    it("converts afternoon/evening times correctly", () => {
      expect(getTimeInMinutes("1:00 PM")).toBe(780); // 13 * 60
      expect(getTimeInMinutes("4:30 PM")).toBe(990); // 16 * 60 + 30
      expect(getTimeInMinutes("11:59 PM")).toBe(1439); // 23 * 60 + 59
    });

    it("handles midnight correctly", () => {
      expect(getTimeInMinutes("12:00 AM")).toBe(0);
      expect(getTimeInMinutes("12:30 AM")).toBe(30);
    });

    it("handles noon correctly", () => {
      expect(getTimeInMinutes("12:00 PM")).toBe(720); // 12 * 60
      expect(getTimeInMinutes("12:30 PM")).toBe(750); // 12 * 60 + 30
    });

    it("is useful for sorting validation", () => {
      // Morning should be before afternoon
      expect(getTimeInMinutes("9:00 AM")).toBeLessThan(
        getTimeInMinutes("2:00 PM"),
      );
      // Same hour different minutes
      expect(getTimeInMinutes("9:00 AM")).toBeLessThan(
        getTimeInMinutes("9:30 AM"),
      );
    });
  });

  describe("compareEventsByTime", () => {
    it("sorts events in chronological order", () => {
      const events = [
        { startTime: "3:00 PM", title: "Afternoon" },
        { startTime: "9:00 AM", title: "Morning" },
        { startTime: "12:00 PM", title: "Noon" },
      ];

      const sorted = [...events].sort(compareEventsByTime);

      expect(sorted[0].title).toBe("Morning");
      expect(sorted[1].title).toBe("Noon");
      expect(sorted[2].title).toBe("Afternoon");
    });

    it("handles events with same time", () => {
      const events = [
        { startTime: "9:00 AM", title: "First" },
        { startTime: "9:00 AM", title: "Second" },
      ];

      const sorted = [...events].sort(compareEventsByTime);

      // Stable sort preserves original order for equal elements
      expect(sorted[0].title).toBe("First");
      expect(sorted[1].title).toBe("Second");
    });

    it("works as Array.sort() comparator", () => {
      const events = [
        { startTime: "11:30 PM" },
        { startTime: "12:00 AM" },
        { startTime: "12:00 PM" },
        { startTime: "6:00 AM" },
      ];

      events.sort(compareEventsByTime);

      expect(events.map((e) => e.startTime)).toEqual([
        "12:00 AM",
        "6:00 AM",
        "12:00 PM",
        "11:30 PM",
      ]);
    });

    it("returns negative, zero, or positive for proper sorting", () => {
      const early = { startTime: "9:00 AM" };
      const late = { startTime: "5:00 PM" };
      const same = { startTime: "9:00 AM" };

      expect(compareEventsByTime(early, late)).toBeLessThan(0);
      expect(compareEventsByTime(late, early)).toBeGreaterThan(0);
      expect(compareEventsByTime(early, same)).toBe(0);
    });
  });

  describe("format24hTo12h", () => {
    it('converts "00:00" to "12:00 AM" (midnight)', () => {
      expect(format24hTo12h("00:00")).toBe("12:00 AM");
    });

    it('converts "12:00" to "12:00 PM" (noon)', () => {
      expect(format24hTo12h("12:00")).toBe("12:00 PM");
    });

    it("converts afternoon times correctly", () => {
      expect(format24hTo12h("16:30")).toBe("4:30 PM");
      expect(format24hTo12h("13:00")).toBe("1:00 PM");
      expect(format24hTo12h("23:59")).toBe("11:59 PM");
    });

    it("converts morning times correctly", () => {
      expect(format24hTo12h("09:00")).toBe("9:00 AM");
      expect(format24hTo12h("06:30")).toBe("6:30 AM");
      expect(format24hTo12h("01:15")).toBe("1:15 AM");
    });

    it("handles single-digit hours in 24h format", () => {
      expect(format24hTo12h("09:00")).toBe("9:00 AM");
      expect(format24hTo12h("9:00")).toBe("9:00 AM");
    });

    it("handles times at the 12-hour boundary", () => {
      expect(format24hTo12h("11:59")).toBe("11:59 AM");
      expect(format24hTo12h("12:01")).toBe("12:01 PM");
    });

    it("preserves minutes correctly", () => {
      expect(format24hTo12h("14:45")).toBe("2:45 PM");
      expect(format24hTo12h("08:05")).toBe("8:05 AM");
    });
  });

  describe("format12hTo24h", () => {
    it('converts "12:00 AM" to "00:00" (midnight)', () => {
      expect(format12hTo24h("12:00 AM")).toBe("00:00");
    });

    it('converts "12:00 PM" to "12:00" (noon)', () => {
      expect(format12hTo24h("12:00 PM")).toBe("12:00");
    });

    it("converts afternoon times correctly", () => {
      expect(format12hTo24h("4:30 PM")).toBe("16:30");
      expect(format12hTo24h("1:00 PM")).toBe("13:00");
      expect(format12hTo24h("11:59 PM")).toBe("23:59");
    });

    it("converts morning times correctly", () => {
      expect(format12hTo24h("9:00 AM")).toBe("09:00");
      expect(format12hTo24h("6:30 AM")).toBe("06:30");
      expect(format12hTo24h("1:15 AM")).toBe("01:15");
    });

    it("pads single-digit hours", () => {
      expect(format12hTo24h("1:00 AM")).toBe("01:00");
      expect(format12hTo24h("9:00 AM")).toBe("09:00");
    });

    it("round-trip test: format24hTo12h(format12hTo24h(x)) === x", () => {
      const times12h = [
        "12:00 AM",
        "1:00 AM",
        "9:30 AM",
        "11:59 AM",
        "12:00 PM",
        "12:30 PM",
        "4:30 PM",
        "11:59 PM",
      ];

      for (const time of times12h) {
        expect(format24hTo12h(format12hTo24h(time))).toBe(time);
      }
    });

    it("round-trip test: format12hTo24h(format24hTo12h(x)) === x", () => {
      const times24h = [
        "00:00",
        "01:00",
        "09:30",
        "11:59",
        "12:00",
        "12:30",
        "16:30",
        "23:59",
      ];

      for (const time of times24h) {
        expect(format12hTo24h(format24hTo12h(time))).toBe(time);
      }
    });
  });

  describe("formatLocalDate", () => {
    it('formats to "yyyy-MM-dd" in local timezone', () => {
      // Create a specific date at noon to avoid any DST edge cases
      const date = new Date(2025, 11, 23, 12, 0, 0); // Dec 23, 2025
      expect(formatLocalDate(date)).toBe("2025-12-23");
    });

    it("does NOT use toISOString() (avoids UTC shift)", () => {
      // Create a date at 11 PM local time
      // If toISOString was used, this might shift to next day in UTC
      const date = new Date(2025, 11, 23, 23, 0, 0); // Dec 23, 2025, 11 PM local
      expect(formatLocalDate(date)).toBe("2025-12-23");
    });

    it("handles month boundaries", () => {
      const endOfMonth = new Date(2025, 0, 31, 12, 0, 0); // Jan 31, 2025
      expect(formatLocalDate(endOfMonth)).toBe("2025-01-31");

      const startOfMonth = new Date(2025, 1, 1, 12, 0, 0); // Feb 1, 2025
      expect(formatLocalDate(startOfMonth)).toBe("2025-02-01");
    });

    it("handles year boundaries", () => {
      const endOfYear = new Date(2025, 11, 31, 12, 0, 0); // Dec 31, 2025
      expect(formatLocalDate(endOfYear)).toBe("2025-12-31");

      const startOfYear = new Date(2026, 0, 1, 12, 0, 0); // Jan 1, 2026
      expect(formatLocalDate(startOfYear)).toBe("2026-01-01");
    });

    it("handles leap year date (Feb 29)", () => {
      const leapDay = new Date(2024, 1, 29, 12, 0, 0); // Feb 29, 2024
      expect(formatLocalDate(leapDay)).toBe("2024-02-29");
    });

    it("pads single-digit months and days", () => {
      const date = new Date(2025, 0, 5, 12, 0, 0); // Jan 5, 2025
      expect(formatLocalDate(date)).toBe("2025-01-05");
    });

    it("handles dates at midnight", () => {
      const midnight = new Date(2025, 5, 15, 0, 0, 0); // June 15, 2025, midnight
      expect(formatLocalDate(midnight)).toBe("2025-06-15");
    });
  });

  describe("parseLocalDate", () => {
    it('parses "yyyy-MM-dd" to Date at local midnight', () => {
      const date = parseLocalDate("2025-12-23");
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(11); // December is month 11
      expect(date.getDate()).toBe(23);
    });

    it("resulting date has hours=0, minutes=0, seconds=0", () => {
      const date = parseLocalDate("2025-12-23");
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });

    it("does NOT shift to previous day (common bug!)", () => {
      // This is the critical timezone bug that plagued the codebase
      // Using new Date("2025-12-23") without timezone handling
      // would create midnight UTC, which is previous day in PST
      const date = parseLocalDate("2025-12-23");
      expect(date.getDate()).toBe(23); // Should be 23, not 22
    });

    it("round-trip test: formatLocalDate(parseLocalDate(x)) === x", () => {
      const dateStrings = [
        "2025-01-01",
        "2025-06-15",
        "2025-12-31",
        "2024-02-29", // Leap year
        "2025-03-09", // Around DST start (US)
        "2025-11-02", // Around DST end (US)
      ];

      for (const dateStr of dateStrings) {
        expect(formatLocalDate(parseLocalDate(dateStr))).toBe(dateStr);
      }
    });

    it("handles month boundaries", () => {
      const endOfMonth = parseLocalDate("2025-01-31");
      expect(endOfMonth.getDate()).toBe(31);

      const startOfMonth = parseLocalDate("2025-02-01");
      expect(startOfMonth.getDate()).toBe(1);
    });

    it("handles year boundaries", () => {
      const endOfYear = parseLocalDate("2025-12-31");
      expect(endOfYear.getFullYear()).toBe(2025);
      expect(endOfYear.getMonth()).toBe(11);
      expect(endOfYear.getDate()).toBe(31);

      const startOfYear = parseLocalDate("2026-01-01");
      expect(startOfYear.getFullYear()).toBe(2026);
      expect(startOfYear.getMonth()).toBe(0);
      expect(startOfYear.getDate()).toBe(1);
    });

    it("handles leap year date (Feb 29)", () => {
      const leapDay = parseLocalDate("2024-02-29");
      expect(leapDay.getFullYear()).toBe(2024);
      expect(leapDay.getMonth()).toBe(1); // February
      expect(leapDay.getDate()).toBe(29);
    });
  });

  describe("getSmartDefaultTimes", () => {
    it("defaults to 9 AM when current time is before 6 AM", () => {
      const earlyMorning = new Date(2025, 0, 27, 4, 30, 0); // 4:30 AM
      const result = getSmartDefaultTimes(earlyMorning);

      expect(result.startTime).toBe("09:00");
      expect(result.endTime).toBe("10:00");
    });

    it("defaults to 9 AM at exactly 5:59 AM", () => {
      const justBeforeSix = new Date(2025, 0, 27, 5, 59, 0); // 5:59 AM
      const result = getSmartDefaultTimes(justBeforeSix);

      expect(result.startTime).toBe("09:00");
      expect(result.endTime).toBe("10:00");
    });

    it("uses current time at exactly 6 AM (boundary)", () => {
      const sixAM = new Date(2025, 0, 27, 6, 0, 0); // 6:00 AM
      const result = getSmartDefaultTimes(sixAM);

      expect(result.startTime).toBe("06:00");
      expect(result.endTime).toBe("07:00");
    });

    it("uses current time at 6:10 AM rounded up to 6:15", () => {
      const sixTen = new Date(2025, 0, 27, 6, 10, 0); // 6:10 AM
      const result = getSmartDefaultTimes(sixTen);

      expect(result.startTime).toBe("06:15");
      expect(result.endTime).toBe("07:15");
    });

    it("rounds up to next 15-min slot during visible hours", () => {
      const afternoon = new Date(2025, 0, 27, 14, 23, 0); // 2:23 PM
      const result = getSmartDefaultTimes(afternoon);

      expect(result.startTime).toBe("14:30"); // Rounded up from :23
      expect(result.endTime).toBe("15:30");
    });

    it("keeps time unchanged when already on 15-min boundary", () => {
      const onBoundary = new Date(2025, 0, 27, 10, 45, 0); // 10:45 AM
      const result = getSmartDefaultTimes(onBoundary);

      expect(result.startTime).toBe("10:45");
      expect(result.endTime).toBe("11:45");
    });

    it("handles rounding to next hour correctly", () => {
      const nearHour = new Date(2025, 0, 27, 14, 46, 0); // 2:46 PM
      const result = getSmartDefaultTimes(nearHour);

      expect(result.startTime).toBe("15:00"); // Rounds to 3:00 PM
      expect(result.endTime).toBe("16:00");
    });

    it("falls back to 9 AM when rounding pushes past visible boundary (9:59 PM)", () => {
      const nineNinePM = new Date(2025, 0, 27, 21, 59, 0); // 9:59 PM
      const result = getSmartDefaultTimes(nineNinePM);

      // Rounding 21:59 → 22:00 crosses CALENDAR_END_HOUR, so falls back to 9 AM
      expect(result.startTime).toBe("09:00");
      expect(result.endTime).toBe("10:00");
    });

    it("falls back to 9 AM when rounding 21:46 pushes to 22:00", () => {
      const result = getSmartDefaultTimes(new Date(2025, 0, 27, 21, 46, 0));

      expect(result.startTime).toBe("09:00");
      expect(result.endTime).toBe("10:00");
    });

    it("keeps 21:45 when rounding stays within visible range", () => {
      const result = getSmartDefaultTimes(new Date(2025, 0, 27, 21, 45, 0));

      expect(result.startTime).toBe("21:45");
      expect(result.endTime).toBe("22:45");
    });

    it("defaults to 9 AM at exactly 10 PM (boundary)", () => {
      const tenPM = new Date(2025, 0, 27, 22, 0, 0); // 10:00 PM
      const result = getSmartDefaultTimes(tenPM);

      expect(result.startTime).toBe("09:00");
      expect(result.endTime).toBe("10:00");
    });

    it("defaults to 9 AM late at night (11 PM)", () => {
      const lateNight = new Date(2025, 0, 27, 23, 15, 0); // 11:15 PM
      const result = getSmartDefaultTimes(lateNight);

      expect(result.startTime).toBe("09:00");
      expect(result.endTime).toBe("10:00");
    });

    it("defaults to 9 AM at midnight", () => {
      const midnight = new Date(2025, 0, 27, 0, 0, 0); // 12:00 AM
      const result = getSmartDefaultTimes(midnight);

      expect(result.startTime).toBe("09:00");
      expect(result.endTime).toBe("10:00");
    });

    it("end time is always 1 hour after start time", () => {
      const times = [
        new Date(2025, 0, 27, 4, 0, 0), // Outside visible (defaults to 9 AM)
        new Date(2025, 0, 27, 8, 30, 0), // Within visible
        new Date(2025, 0, 27, 15, 0, 0), // Within visible
        new Date(2025, 0, 27, 23, 0, 0), // Outside visible (defaults to 9 AM)
      ];

      for (const time of times) {
        const result = getSmartDefaultTimes(time);
        const startHour = Number.parseInt(result.startTime.split(":")[0], 10);
        const startMin = Number.parseInt(result.startTime.split(":")[1], 10);
        const endHour = Number.parseInt(result.endTime.split(":")[0], 10);
        const endMin = Number.parseInt(result.endTime.split(":")[1], 10);

        const startTotalMins = startHour * 60 + startMin;
        const endTotalMins = endHour * 60 + endMin;

        expect(endTotalMins - startTotalMins).toBe(60);
      }
    });

    it("exports correct constants", () => {
      expect(CALENDAR_START_HOUR).toBe(6);
      expect(CALENDAR_END_HOUR).toBe(22);
      expect(DEFAULT_EVENT_HOUR).toBe(9);
    });
  });

  describe("integration: time format consistency", () => {
    it("parsed 12h times can be converted to 24h and back", () => {
      const originalTimes = ["9:00 AM", "12:00 PM", "4:30 PM", "12:00 AM"];

      for (const time of originalTimes) {
        const parsed = parseTime(time);
        const as24h = `${parsed.hours.toString().padStart(2, "0")}:${parsed.minutes.toString().padStart(2, "0")}`;
        const backTo12h = format24hTo12h(as24h);
        expect(backTo12h).toBe(time);
      }
    });

    it("event sorting works with real-world event data", () => {
      const events = [
        { startTime: "2:30 PM", title: "Lunch meeting" },
        { startTime: "9:00 AM", title: "Standup" },
        { startTime: "4:00 PM", title: "Review" },
        { startTime: "12:00 PM", title: "Noon break" },
        { startTime: "12:00 AM", title: "Midnight event" },
      ];

      const sorted = [...events].sort(compareEventsByTime);

      expect(sorted.map((e) => e.title)).toEqual([
        "Midnight event",
        "Standup",
        "Noon break",
        "Lunch meeting",
        "Review",
      ]);
    });
  });
});
