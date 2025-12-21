import { z } from "zod";

/**
 * Schema for calendar event form validation
 * Used by AddEventModal and future EditEventModal
 */
export const eventFormSchema = z
  .object({
    title: z
      .string()
      .min(1, "Event name is required")
      .max(100, "Event name must be 100 characters or less"),
    date: z.string().min(1, "Date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    memberId: z.string().min(1, "Please select a family member"),
    location: z.string().optional(),
    isAllDay: z.boolean().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

/**
 * TypeScript type inferred from the schema
 * Use this for form data typing
 */
export type EventFormData = z.infer<typeof eventFormSchema>;
