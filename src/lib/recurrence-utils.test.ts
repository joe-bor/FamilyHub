import { describe, expect, it } from "vitest";
import {
  buildRRule,
  formatRecurrenceLabel,
  parseRRule,
  type RecurrenceFormState,
} from "./recurrence-utils";

describe("recurrence-utils", () => {
  describe("buildRRule", () => {
    it('returns null for frequency "none"', () => {
      expect(buildRRule({ frequency: "none", interval: 1 })).toBeNull();
    });

    it("builds daily RRULE", () => {
      expect(buildRRule({ frequency: "daily", interval: 1 })).toBe(
        "FREQ=DAILY",
      );
    });

    it("builds weekly RRULE with days", () => {
      expect(
        buildRRule({
          frequency: "weekly",
          interval: 1,
          weeklyDays: ["TU", "TH", "FR"],
        }),
      ).toBe("FREQ=WEEKLY;BYDAY=TU,TH,FR");
    });

    it("sorts weekly days in standard order", () => {
      expect(
        buildRRule({
          frequency: "weekly",
          interval: 1,
          weeklyDays: ["FR", "MO", "WE"],
        }),
      ).toBe("FREQ=WEEKLY;BYDAY=MO,WE,FR");
    });

    it("builds weekly RRULE without explicit days", () => {
      expect(buildRRule({ frequency: "weekly", interval: 1 })).toBe(
        "FREQ=WEEKLY",
      );
    });

    it("builds monthly RRULE with day of month", () => {
      expect(
        buildRRule({ frequency: "monthly", interval: 1, monthDay: 15 }),
      ).toBe("FREQ=MONTHLY;BYMONTHDAY=15");
    });

    it("includes INTERVAL when > 1", () => {
      expect(buildRRule({ frequency: "daily", interval: 3 })).toBe(
        "FREQ=DAILY;INTERVAL=3",
      );
    });

    it("omits INTERVAL when 1", () => {
      const result = buildRRule({ frequency: "daily", interval: 1 });
      expect(result).not.toContain("INTERVAL");
    });

    it("includes UNTIL when endDate provided", () => {
      expect(
        buildRRule({
          frequency: "daily",
          interval: 1,
          endDate: "2026-08-15",
        }),
      ).toBe("FREQ=DAILY;UNTIL=20260815");
    });

    it("combines interval, days, and until", () => {
      expect(
        buildRRule({
          frequency: "weekly",
          interval: 2,
          weeklyDays: ["MO", "FR"],
          endDate: "2026-06-15",
        }),
      ).toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR;UNTIL=20260615");
    });
  });

  describe("parseRRule", () => {
    it("parses daily RRULE", () => {
      const result = parseRRule("FREQ=DAILY");
      expect(result).toEqual({
        frequency: "daily",
        interval: 1,
        weeklyDays: undefined,
        monthDay: undefined,
        endDate: undefined,
      });
    });

    it("parses weekly RRULE with days", () => {
      const result = parseRRule("FREQ=WEEKLY;BYDAY=TU,TH,FR");
      expect(result.frequency).toBe("weekly");
      expect(result.weeklyDays).toEqual(["TU", "TH", "FR"]);
    });

    it("parses monthly RRULE with BYMONTHDAY", () => {
      const result = parseRRule("FREQ=MONTHLY;BYMONTHDAY=15");
      expect(result.frequency).toBe("monthly");
      expect(result.monthDay).toBe(15);
    });

    it("parses INTERVAL", () => {
      const result = parseRRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO");
      expect(result.interval).toBe(2);
    });

    it("defaults interval to 1 when not present", () => {
      const result = parseRRule("FREQ=DAILY");
      expect(result.interval).toBe(1);
    });

    it("parses UNTIL to yyyy-MM-dd", () => {
      const result = parseRRule("FREQ=DAILY;UNTIL=20260815");
      expect(result.endDate).toBe("2026-08-15");
    });

    it('returns frequency "none" for unknown FREQ', () => {
      const result = parseRRule("FREQ=YEARLY");
      expect(result.frequency).toBe("none");
    });
  });

  describe("buildRRule / parseRRule round-trip", () => {
    const cases: RecurrenceFormState[] = [
      { frequency: "daily", interval: 1 },
      { frequency: "daily", interval: 3, endDate: "2026-08-15" },
      { frequency: "weekly", interval: 1, weeklyDays: ["TU", "TH", "FR"] },
      {
        frequency: "weekly",
        interval: 2,
        weeklyDays: ["MO", "FR"],
        endDate: "2026-06-15",
      },
      { frequency: "monthly", interval: 1, monthDay: 15 },
    ];

    for (const state of cases) {
      it(`round-trips: ${JSON.stringify(state)}`, () => {
        const rrule = buildRRule(state)!;
        const parsed = parseRRule(rrule);
        // Re-build from parsed to check equivalence
        expect(buildRRule(parsed)).toBe(rrule);
      });
    }
  });

  describe("formatRecurrenceLabel", () => {
    const date = new Date(2026, 2, 11); // Wednesday March 11, 2026

    it("formats daily", () => {
      expect(formatRecurrenceLabel("FREQ=DAILY", date)).toBe("Daily");
    });

    it("formats daily with interval", () => {
      expect(formatRecurrenceLabel("FREQ=DAILY;INTERVAL=3", date)).toBe(
        "Every 3 days",
      );
    });

    it("formats weekly with specific days", () => {
      expect(formatRecurrenceLabel("FREQ=WEEKLY;BYDAY=TU,TH,FR", date)).toBe(
        "Weekly on Tue, Thu, Fri",
      );
    });

    it("formats weekly without days (uses event date)", () => {
      expect(formatRecurrenceLabel("FREQ=WEEKLY", date)).toBe(
        "Weekly on Wednesday",
      );
    });

    it("formats weekly with interval", () => {
      expect(
        formatRecurrenceLabel("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", date),
      ).toBe("Every 2 weeks on Mon");
    });

    it("formats monthly with BYMONTHDAY", () => {
      expect(formatRecurrenceLabel("FREQ=MONTHLY;BYMONTHDAY=15", date)).toBe(
        "Monthly on the 15th",
      );
    });

    it("formats monthly without BYMONTHDAY (uses event date)", () => {
      expect(formatRecurrenceLabel("FREQ=MONTHLY", date)).toBe(
        "Monthly on the 11th",
      );
    });

    it("formats ordinal suffixes correctly", () => {
      expect(formatRecurrenceLabel("FREQ=MONTHLY;BYMONTHDAY=1", date)).toBe(
        "Monthly on the 1st",
      );
      expect(formatRecurrenceLabel("FREQ=MONTHLY;BYMONTHDAY=2", date)).toBe(
        "Monthly on the 2nd",
      );
      expect(formatRecurrenceLabel("FREQ=MONTHLY;BYMONTHDAY=3", date)).toBe(
        "Monthly on the 3rd",
      );
      expect(formatRecurrenceLabel("FREQ=MONTHLY;BYMONTHDAY=11", date)).toBe(
        "Monthly on the 11th",
      );
      expect(formatRecurrenceLabel("FREQ=MONTHLY;BYMONTHDAY=21", date)).toBe(
        "Monthly on the 21st",
      );
    });

    it("appends until date", () => {
      expect(formatRecurrenceLabel("FREQ=DAILY;UNTIL=20260615", date)).toBe(
        "Daily until Jun 15, 2026",
      );
    });

    it('returns "Does not repeat" for unknown frequency', () => {
      expect(formatRecurrenceLabel("FREQ=YEARLY", date)).toBe(
        "Does not repeat",
      );
    });
  });
});
