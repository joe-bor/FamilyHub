import { describe, expect, it } from "vitest";
import { type EventFormData, eventFormSchema } from "./calendar";

/**
 * Helper to create valid event data for tests.
 * Override specific fields as needed.
 */
function createValidEventData(
  overrides: Partial<EventFormData> = {},
): EventFormData {
  return {
    title: "Team Meeting",
    date: "2025-12-23",
    startTime: "09:00",
    endTime: "10:00",
    memberId: "member-1",
    ...overrides,
  };
}

describe("calendar validations", () => {
  describe("eventFormSchema", () => {
    describe("title field", () => {
      it("accepts valid title", () => {
        const data = createValidEventData({ title: "Team Meeting" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("rejects empty title", () => {
        const data = createValidEventData({ title: "" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Event name is required");
        }
      });

      it("accepts title with exactly 100 characters", () => {
        const data = createValidEventData({ title: "a".repeat(100) });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("rejects title with 101 characters", () => {
        const data = createValidEventData({ title: "a".repeat(101) });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "Event name must be 100 characters or less",
          );
        }
      });

      it("accepts single character title", () => {
        const data = createValidEventData({ title: "A" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("date field", () => {
      it("accepts valid date format (yyyy-MM-dd)", () => {
        const data = createValidEventData({ date: "2025-12-23" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("rejects empty date", () => {
        const data = createValidEventData({ date: "" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Date is required");
        }
      });

      it("rejects date in MM-dd-yyyy format", () => {
        const data = createValidEventData({ date: "12-23-2025" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Invalid date format");
        }
      });

      it("rejects date with slashes (yyyy/MM/dd)", () => {
        const data = createValidEventData({ date: "2025/12/23" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("rejects date with single-digit month", () => {
        const data = createValidEventData({ date: "2025-1-23" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("rejects date with single-digit day", () => {
        const data = createValidEventData({ date: "2025-12-1" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("accepts date at year boundary", () => {
        const data = createValidEventData({ date: "2025-01-01" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("accepts date at end of year", () => {
        const data = createValidEventData({ date: "2025-12-31" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("startTime field", () => {
      it("accepts valid 24h time format", () => {
        const data = createValidEventData({
          startTime: "14:30",
          endTime: "15:00",
        });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("rejects empty startTime", () => {
        const data = createValidEventData({ startTime: "" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Start time is required");
        }
      });

      it("accepts midnight (0:00)", () => {
        const data = createValidEventData({
          startTime: "0:00",
          endTime: "1:00",
        });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("accepts end of day (23:59)", () => {
        const data = createValidEventData({
          startTime: "23:00",
          endTime: "23:59",
        });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("rejects invalid hour (24:00)", () => {
        const data = createValidEventData({ startTime: "24:00" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Invalid time format");
        }
      });

      it("rejects invalid minutes (14:60)", () => {
        const data = createValidEventData({ startTime: "14:60" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("rejects time without leading zero on minutes (9:5)", () => {
        const data = createValidEventData({ startTime: "9:5" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("accepts time without leading zero on hours (9:05)", () => {
        const data = createValidEventData({
          startTime: "9:05",
          endTime: "10:00",
        });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("rejects time in 12h format", () => {
        const data = createValidEventData({ startTime: "9:00 AM" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe("endTime field", () => {
      it("accepts valid 24h time format", () => {
        const data = createValidEventData({ endTime: "17:30" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("rejects empty endTime", () => {
        const data = createValidEventData({ endTime: "" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("End time is required");
        }
      });

      it("rejects invalid hour (24:00)", () => {
        const data = createValidEventData({ endTime: "24:00" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("rejects invalid minutes (14:60)", () => {
        const data = createValidEventData({ endTime: "14:60" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe("time refinement (endTime > startTime)", () => {
      it("accepts when endTime is after startTime", () => {
        const data = createValidEventData({
          startTime: "09:00",
          endTime: "10:00",
        });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("accepts when endTime is one minute after startTime", () => {
        const data = createValidEventData({
          startTime: "14:00",
          endTime: "14:01",
        });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("rejects when endTime equals startTime", () => {
        const data = createValidEventData({
          startTime: "14:00",
          endTime: "14:00",
        });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          const endTimeError = result.error.issues.find(
            (issue) => issue.path[0] === "endTime",
          );
          expect(endTimeError?.message).toBe(
            "End time must be after start time",
          );
        }
      });

      it("rejects when endTime is before startTime", () => {
        const data = createValidEventData({
          startTime: "14:00",
          endTime: "09:00",
        });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          const endTimeError = result.error.issues.find(
            (issue) => issue.path[0] === "endTime",
          );
          expect(endTimeError?.message).toBe(
            "End time must be after start time",
          );
        }
      });

      it("accepts late evening event (23:00 to 23:59)", () => {
        const data = createValidEventData({
          startTime: "23:00",
          endTime: "23:59",
        });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("accepts early morning event (0:00 to 1:00)", () => {
        const data = createValidEventData({
          startTime: "0:00",
          endTime: "1:00",
        });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("accepts full day event (0:00 to 23:59)", () => {
        const data = createValidEventData({
          startTime: "0:00",
          endTime: "23:59",
        });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("memberId field", () => {
      it("accepts valid memberId", () => {
        const data = createValidEventData({ memberId: "member-1" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("rejects empty memberId", () => {
        const data = createValidEventData({ memberId: "" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "Please select a family member",
          );
        }
      });

      it("accepts any non-empty string as memberId", () => {
        const data = createValidEventData({ memberId: "abc123" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("optional fields", () => {
      it("accepts data without location", () => {
        const { location, ...dataWithoutLocation } = createValidEventData();
        const result = eventFormSchema.safeParse(dataWithoutLocation);
        expect(result.success).toBe(true);
      });

      it("accepts data with location", () => {
        const data = createValidEventData({ location: "Conference Room A" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.location).toBe("Conference Room A");
        }
      });

      it("accepts data without isAllDay", () => {
        const { isAllDay, ...dataWithoutIsAllDay } = createValidEventData();
        const result = eventFormSchema.safeParse(dataWithoutIsAllDay);
        expect(result.success).toBe(true);
      });

      it("accepts data with isAllDay set to true", () => {
        const data = createValidEventData({ isAllDay: true });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isAllDay).toBe(true);
        }
      });

      it("accepts data with isAllDay set to false", () => {
        const data = createValidEventData({ isAllDay: false });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isAllDay).toBe(false);
        }
      });

      it("accepts empty string for location", () => {
        const data = createValidEventData({ location: "" });
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("complete validation scenarios", () => {
      it("validates complete valid event data", () => {
        const data: EventFormData = {
          title: "Project Planning Meeting",
          date: "2025-12-23",
          startTime: "09:00",
          endTime: "10:30",
          memberId: "member-123",
          location: "Main Office",
          isAllDay: false,
        };
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(data);
        }
      });

      it("validates minimal valid event data", () => {
        const data = {
          title: "Quick Meeting",
          date: "2025-01-15",
          startTime: "14:00",
          endTime: "14:30",
          memberId: "m1",
        };
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("rejects completely invalid data", () => {
        const data = {
          title: "",
          date: "invalid",
          startTime: "25:00",
          endTime: "99:99",
          memberId: "",
        };
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
        }
      });

      it("accumulates multiple validation errors", () => {
        const data = {
          title: "",
          date: "",
          startTime: "",
          endTime: "",
          memberId: "",
        };
        const result = eventFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          // Should have errors for all required fields
          expect(result.error.issues.length).toBeGreaterThanOrEqual(5);
        }
      });
    });
  });
});
