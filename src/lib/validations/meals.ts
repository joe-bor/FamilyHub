import { z } from "zod";
import type { MealEntryRequest } from "@/lib/types";

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Use yyyy-MM-dd",
});

const optionalTextSchema = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  });

function isHttpOrHttpsUrl(value: string) {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

const httpUrlSchema = z
  .string()
  .url("Enter a valid URL")
  .refine(isHttpOrHttpsUrl, "Enter an http or https URL");

const optionalUrlSchema = optionalTextSchema.pipe(httpUrlSchema.nullable());

const quickTitleSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "Meal name is required")
      .max(160, "Meal name must be 160 characters or less"),
  );

export const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner"]);
export const mealSourceTypeSchema = z.enum(["recipe", "quick"]);
export const mealCollisionModeSchema = z.enum([
  "replace_primary",
  "add_as_extra",
]);

const quickMealEntrySchema = z.object({
  sourceType: z.literal("quick"),
  recipeId: z.null().optional().default(null),
  title: quickTitleSchema,
  imageUrl: optionalUrlSchema,
  note: optionalTextSchema,
});

const recipeMealEntrySchema = z.object({
  sourceType: z.literal("recipe"),
  recipeId: z.string().uuid("Recipe is required"),
  title: z.null().optional().default(null),
  imageUrl: z.null().optional().default(null),
  note: z.null().optional().default(null),
});

export const mealEntrySchema = z.discriminatedUnion("sourceType", [
  quickMealEntrySchema,
  recipeMealEntrySchema,
]);

export const upsertMealSlotSchema = z.object({
  weekStartDate: localDateSchema,
  dayIndex: z.number().int().min(0).max(6),
  mealType: mealTypeSchema,
  primary: mealEntrySchema,
  extras: z.array(mealEntrySchema).optional().default([]),
  note: optionalTextSchema,
  collisionMode: mealCollisionModeSchema.nullable().optional().default(null),
});

export const saveMealPlanSlotSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  mealType: mealTypeSchema,
  primary: mealEntrySchema,
  extras: z.array(mealEntrySchema).optional().default([]),
  note: optionalTextSchema,
});

export const saveMealPlanSchema = z.object({
  weekStartDate: localDateSchema,
  slots: z.array(saveMealPlanSlotSchema).min(1).max(21),
});

export const moveMealSlotSchema = z.object({
  sourceWeekStartDate: localDateSchema,
  sourceDayIndex: z.number().int().min(0).max(6),
  sourceMealType: mealTypeSchema,
  destinationWeekStartDate: localDateSchema,
  destinationDayIndex: z.number().int().min(0).max(6),
  destinationMealType: mealTypeSchema,
  collisionMode: mealCollisionModeSchema,
});

export const duplicateMealSlotSchema = moveMealSlotSchema;

export const removeMealSlotSchema = z.object({
  weekStartDate: localDateSchema,
  dayIndex: z.number().int().min(0).max(6),
  mealType: mealTypeSchema,
});

export type MealEntryFormData = z.infer<typeof mealEntrySchema>;
export type UpsertMealSlotFormData = z.infer<typeof upsertMealSlotSchema>;

export function toMealEntryRequest(
  formData: MealEntryFormData,
): MealEntryRequest {
  if (formData.sourceType === "recipe") {
    return {
      sourceType: "recipe",
      recipeId: formData.recipeId,
      title: null,
      imageUrl: null,
      note: null,
    };
  }

  return {
    sourceType: "quick",
    recipeId: null,
    title: formData.title,
    imageUrl: formData.imageUrl,
    note: formData.note,
  };
}
