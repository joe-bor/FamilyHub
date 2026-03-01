import { z } from "zod";

// BE DTO alignment:
//   FamilyRequest.java      — name: @Size(max=50)
//   FamilyMemberRequest.java — name: @Size(max=30), email: @Size(max=254) @Email,
//                              color: @NotBlank, avatarUrl: @Size(max=254)

/**
 * Schema for family name validation.
 * Used in onboarding step 2 and family settings.
 */
export const familyNameSchema = z.object({
  name: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(1, "Family name is required")
        .max(50, "Family name must be 50 characters or less"),
    ),
});

export type FamilyNameFormData = z.infer<typeof familyNameSchema>;

/**
 * Valid family colors.
 */
const familyColorSchema = z.enum([
  "coral",
  "teal",
  "green",
  "purple",
  "yellow",
  "pink",
  "orange",
]);

/**
 * Schema for family member form validation.
 * Used when adding or editing a family member.
 */
export const memberFormSchema = z.object({
  name: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(1, "Name is required")
        .max(30, "Name must be 30 characters or less"),
    ),
  color: familyColorSchema.refine((val) => val !== undefined, {
    message: "Please select a color",
  }),
});

export type MemberFormData = z.infer<typeof memberFormSchema>;

/**
 * Creates a member form schema with duplicate name validation.
 * @param existingNames - Array of existing member names to check against
 * @param currentName - Current member name (for edit mode, to exclude self)
 */
export const createMemberFormSchema = (
  existingNames: string[],
  currentName?: string,
) => {
  const lowerNames = existingNames
    .filter((n) => n.toLowerCase() !== currentName?.toLowerCase())
    .map((n) => n.toLowerCase());

  return z.object({
    name: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(1, "Name is required")
          .max(30, "Name must be 30 characters or less")
          .refine((val) => !lowerNames.includes(val.toLowerCase()), {
            message: "A member with this name already exists",
          }),
      ),
    color: familyColorSchema.refine((val) => val !== undefined, {
      message: "Please select a color",
    }),
  });
};

/**
 * Creates a member profile schema with duplicate name and email validation.
 * Used in MemberProfileModal for editing member profiles.
 * @param existingNames - Array of existing member names to check against
 * @param currentName - Current member name (for edit mode, to exclude self)
 */
export const createMemberProfileSchema = (
  existingNames: string[],
  currentName?: string,
) => {
  const lowerNames = existingNames
    .filter((n) => n.toLowerCase() !== currentName?.toLowerCase())
    .map((n) => n.toLowerCase());

  return z.object({
    name: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(1, "Name is required")
          .max(30, "Name must be 30 characters or less")
          .refine((val) => !lowerNames.includes(val.toLowerCase()), {
            message: "A member with this name already exists",
          }),
      ),
    color: familyColorSchema,
    email: z
      .string()
      .max(254, "Email must be 254 characters or less")
      .transform((val) => val.trim())
      .refine(
        (val) => val === "" || z.string().email().safeParse(val).success,
        { message: "Please enter a valid email" },
      ),
  });
};

export type MemberProfileFormData = z.infer<
  ReturnType<typeof createMemberProfileSchema>
>;

/**
 * Schema for validating a single family member from localStorage.
 */
export const familyMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(30),
  color: familyColorSchema,
  avatarUrl: z.string().max(254).optional(),
  email: z.string().max(254).email().optional().or(z.literal("")),
});

/**
 * Schema for validating FamilyData from localStorage.
 * Used during rehydration to ensure data integrity.
 */
export const familyDataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  members: z.array(familyMemberSchema),
  createdAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
});

export type ValidatedFamilyData = z.infer<typeof familyDataSchema>;

/**
 * Validates family data from localStorage.
 * Returns null if validation fails.
 */
export function validateFamilyData(data: unknown): ValidatedFamilyData | null {
  const result = familyDataSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn("Family data validation failed:", result.error.issues);
  return null;
}
