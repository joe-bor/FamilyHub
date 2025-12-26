import { z } from "zod";

/**
 * Schema for family name validation.
 * Used in onboarding step 2 and family settings.
 */
export const familyNameSchema = z.object({
  name: z
    .string()
    .min(1, "Family name is required")
    .max(50, "Family name must be 50 characters or less")
    .trim(),
});

export type FamilyNameFormData = z.infer<typeof familyNameSchema>;

/**
 * Schema for family member form validation.
 * Used when adding or editing a family member.
 */
export const memberFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(30, "Name must be 30 characters or less")
    .trim(),
  color: z.enum(
    ["coral", "teal", "green", "purple", "yellow", "pink", "orange"],
    { message: "Please select a color" },
  ),
});

export type MemberFormData = z.infer<typeof memberFormSchema>;
