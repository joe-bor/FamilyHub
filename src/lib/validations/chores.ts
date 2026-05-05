import { z } from "zod";

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const choreFormSchema = z.object({
  title: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, "Chore name is required")
        .max(100, "Chore name must be 100 characters or less"),
    ),
  assignedToMemberId: z.string().min(1, "Assignee is required"),
  dueDate: z
    .union([
      z.string().regex(DATE_FORMAT_REGEX, "Invalid date format"),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .transform((value) => value || undefined),
});

export type ChoreFormInput = z.input<typeof choreFormSchema>;
export type ChoreFormData = z.output<typeof choreFormSchema>;
