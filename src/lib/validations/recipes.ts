import { z } from "zod";
import type { CreateRecipeRequest } from "@/lib/types";

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

function orderedTextArray(maxLength?: number, message?: string) {
  const schema = z
    .array(z.string())
    .optional()
    .default([])
    .transform((values) =>
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    );

  return maxLength === undefined
    ? schema
    : schema.pipe(z.array(z.string().max(maxLength, message)));
}

export const recipeFormSchema = z.object({
  title: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, "Recipe title is required")
        .max(160, "Recipe title must be 160 characters or less"),
    ),
  imageUrl: optionalUrlSchema,
  note: optionalTextSchema,
  sourceUrl: optionalUrlSchema,
  ingredients: orderedTextArray(
    500,
    "Ingredient must be 500 characters or less",
  ),
  instructions: orderedTextArray(),
  tags: orderedTextArray(60, "Tag must be 60 characters or less"),
  favorite: z.boolean().optional().default(false),
});

export type RecipeFormData = z.infer<typeof recipeFormSchema>;
export type RecipeFormInput = z.input<typeof recipeFormSchema>;

export function toRecipeRequest(formData: RecipeFormData): CreateRecipeRequest {
  return {
    title: formData.title,
    imageUrl: formData.imageUrl,
    note: formData.note,
    sourceUrl: formData.sourceUrl,
    ingredients: formData.ingredients,
    instructions: formData.instructions,
    tags: formData.tags,
    favorite: formData.favorite,
  };
}
