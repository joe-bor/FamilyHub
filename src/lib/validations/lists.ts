import { z } from "zod";

export const listCreateSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, "List name is required")
        .max(100, "List name must be 100 characters or less"),
    ),
  kind: z.enum(["grocery", "to-do", "general"]),
});

export const listItemSchema = z.object({
  text: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, "Item text is required")
        .max(100, "Item text must be 100 characters or less"),
    ),
  categoryId: z.string().uuid().nullable().optional(),
});

export const categoryNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "Category name is required")
      .max(100, "Category name must be 100 characters or less"),
  );

export type ListCreateFormData = z.infer<typeof listCreateSchema>;
export type ListItemFormData = z.infer<typeof listItemSchema>;
export type CategoryNameFormData = z.infer<typeof categoryNameSchema>;
