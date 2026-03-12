import { z } from "zod";

// BE DTO alignment:
//   CalendarEventRequest.java — title: @Size(max=100), date: @NotBlank,
//     startTime/endTime: @NotBlank, memberId: @NotBlank, location: @Size(max=255)

// Time format validation patterns
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/; // yyyy-MM-dd
const TIME_24H_FORMAT_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm (24h)

/**
 * Convert 24h time string (HH:mm) to minutes since midnight.
 * Used for numeric comparison of times.
 */
function getTimeInMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Schema for calendar event form validation
 * Used by AddEventModal and future EditEventModal
 */
export const eventFormSchema = z
  .object({
    title: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(1, "Event name is required")
          .max(100, "Event name must be 100 characters or less"),
      ),
    date: z
      .string()
      .min(1, "Date is required")
      .regex(DATE_FORMAT_REGEX, "Invalid date format"),
    startTime: z
      .string()
      .min(1, "Start time is required")
      .regex(TIME_24H_FORMAT_REGEX, "Invalid time format"),
    endTime: z
      .string()
      .min(1, "End time is required")
      .regex(TIME_24H_FORMAT_REGEX, "Invalid time format"),
    memberId: z.string().min(1, "Please select a family member"),
    location: z
      .string()
      .max(255, "Location must be 255 characters or less")
      .optional(),
    isAllDay: z.boolean().optional(),
    endDate: z
      .string()
      .regex(DATE_FORMAT_REGEX, "Invalid date format")
      .optional(),
    recurrenceFrequency: z
      .enum(["none", "daily", "weekly", "monthly"])
      .optional(),
    recurrenceInterval: z.number().min(1).optional(),
    recurrenceWeeklyDays: z.array(z.string()).optional(),
    recurrenceMonthDay: z.number().min(1).max(31).optional(),
    recurrenceEndDate: z
      .string()
      .regex(DATE_FORMAT_REGEX, "Invalid date format")
      .optional(),
  })
  .refine(
    (data) =>
      data.isAllDay ||
      getTimeInMinutes(data.endTime) > getTimeInMinutes(data.startTime),
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  )
  .refine((data) => !data.endDate || data.endDate >= data.date, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  })
  .refine((data) => !data.endDate || data.isAllDay, {
    message: "End date is only valid for all-day events",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      if (data.recurrenceFrequency !== "weekly") return true;
      if (!data.recurrenceWeeklyDays) return true;
      return data.recurrenceWeeklyDays.length > 0;
    },
    {
      message: "Select at least one day for weekly recurrence",
      path: ["recurrenceWeeklyDays"],
    },
  );

/**
 * TypeScript type inferred from the schema
 * Use this for form data typing
 */
export type EventFormData = z.infer<typeof eventFormSchema>;
