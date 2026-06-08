import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import type { FieldError } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  type RecipeFormData,
  type RecipeFormInput,
  recipeFormSchema,
  toRecipeRequest,
} from "@/lib/validations/recipes";

const RECIPE_FORM_ID = "recipe-form";
const DEFAULT_LINE_COUNT = 2;

function ensureMinimumLines(values: string[] | undefined) {
  const normalized = values && values.length > 0 ? [...values] : [];

  while (normalized.length < DEFAULT_LINE_COUNT) {
    normalized.push("");
  }

  return normalized;
}

function textInputDefault(value: string | null | undefined) {
  return value ?? "";
}

function getArrayErrorMessage(
  errors: Partial<Record<number, FieldError>> | undefined,
  index: number,
) {
  const message = errors?.[index]?.message;
  return typeof message === "string" ? message : undefined;
}

function ArrayFieldSection({
  legend,
  values,
  errorMessages,
  onChange,
  onAdd,
  onRemove,
}: {
  legend: string;
  values: string[];
  errorMessages?: Array<string | undefined>;
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const singular = legend.endsWith("s") ? legend.slice(0, -1) : legend;

  return (
    <fieldset className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-sm font-semibold text-foreground">
          {legend}
        </legend>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          {`Add ${singular.toLowerCase()}`}
        </Button>
      </div>

      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={`${singular}-${index}`} className="space-y-1">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`${singular} ${index + 1}`}
                aria-invalid={Boolean(errorMessages?.[index])}
                value={value}
                onChange={(event) => onChange(index, event.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${singular.toLowerCase()} ${index + 1}`}
                onClick={() => onRemove(index)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <FormError message={errorMessages?.[index]} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

interface RecipeFormProps {
  onSubmit: (data: RecipeFormData) => void;
  isPending?: boolean;
  errorMessage?: string | null;
  defaultValues?: Partial<RecipeFormInput>;
}

function getDefaultValues(
  defaultValues?: Partial<RecipeFormInput>,
): RecipeFormInput {
  return {
    title: defaultValues?.title ?? "",
    imageUrl: textInputDefault(defaultValues?.imageUrl),
    note: textInputDefault(defaultValues?.note),
    sourceUrl: textInputDefault(defaultValues?.sourceUrl),
    ingredients: ensureMinimumLines(defaultValues?.ingredients),
    instructions: ensureMinimumLines(defaultValues?.instructions),
    tags: ensureMinimumLines(defaultValues?.tags),
    favorite: defaultValues?.favorite ?? false,
  };
}

export function RecipeForm({
  onSubmit,
  isPending = false,
  errorMessage = null,
  defaultValues,
}: RecipeFormProps) {
  const form = useForm<RecipeFormInput, undefined, RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: getDefaultValues(defaultValues),
  });

  const ingredients = ensureMinimumLines(
    useWatch({
      control: form.control,
      name: "ingredients",
    }),
  );
  const instructions = ensureMinimumLines(
    useWatch({
      control: form.control,
      name: "instructions",
    }),
  );
  const tags = ensureMinimumLines(
    useWatch({
      control: form.control,
      name: "tags",
    }),
  );
  const ingredientErrors = form.formState.errors.ingredients as
    | Partial<Record<number, FieldError>>
    | undefined;
  const instructionErrors = form.formState.errors.instructions as
    | Partial<Record<number, FieldError>>
    | undefined;
  const tagErrors = form.formState.errors.tags as
    | Partial<Record<number, FieldError>>
    | undefined;

  return (
    <form
      id={RECIPE_FORM_ID}
      className="space-y-6"
      noValidate
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
    >
      <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>
        Save recipe
      </button>

      <div className="space-y-2">
        <Label htmlFor="recipe-title">Title</Label>
        <Input
          id="recipe-title"
          autoComplete="off"
          {...form.register("title")}
        />
        <FormError message={form.formState.errors.title?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipe-image-url">Image URL</Label>
        <Input
          id="recipe-image-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://example.com/recipe.jpg"
          aria-invalid={Boolean(form.formState.errors.imageUrl)}
          {...form.register("imageUrl")}
        />
        <FormError message={form.formState.errors.imageUrl?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipe-note">Note</Label>
        <textarea
          id="recipe-note"
          className={cn(
            "border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 min-h-24 w-full min-w-0 rounded-lg border bg-transparent px-3 py-2 text-[15px] leading-5 shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          )}
          {...form.register("note")}
        />
        <FormError message={form.formState.errors.note?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipe-source-url">Source URL</Label>
        <Input
          id="recipe-source-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://example.com/recipe"
          aria-invalid={Boolean(form.formState.errors.sourceUrl)}
          {...form.register("sourceUrl")}
        />
        <FormError message={form.formState.errors.sourceUrl?.message} />
      </div>

      <ArrayFieldSection
        legend="Ingredients"
        values={ingredients}
        errorMessages={ingredients.map((_, index) =>
          getArrayErrorMessage(ingredientErrors, index),
        )}
        onChange={(index, value) => {
          const next = [...ingredients];
          next[index] = value;
          form.setValue("ingredients", next, { shouldDirty: true });
        }}
        onAdd={() => {
          form.setValue("ingredients", [...ingredients, ""], {
            shouldDirty: true,
          });
        }}
        onRemove={(index) => {
          form.setValue(
            "ingredients",
            ingredients.filter((_, i) => i !== index),
            { shouldDirty: true },
          );
        }}
      />

      <ArrayFieldSection
        legend="Instructions"
        values={instructions}
        errorMessages={instructions.map((_, index) =>
          getArrayErrorMessage(instructionErrors, index),
        )}
        onChange={(index, value) => {
          const next = [...instructions];
          next[index] = value;
          form.setValue("instructions", next, { shouldDirty: true });
        }}
        onAdd={() => {
          form.setValue("instructions", [...instructions, ""], {
            shouldDirty: true,
          });
        }}
        onRemove={(index) => {
          form.setValue(
            "instructions",
            instructions.filter((_, i) => i !== index),
            { shouldDirty: true },
          );
        }}
      />

      <ArrayFieldSection
        legend="Tags"
        values={tags}
        errorMessages={tags.map((_, index) =>
          getArrayErrorMessage(tagErrors, index),
        )}
        onChange={(index, value) => {
          const next = [...tags];
          next[index] = value;
          form.setValue("tags", next, { shouldDirty: true });
        }}
        onAdd={() => {
          form.setValue("tags", [...tags, ""], {
            shouldDirty: true,
          });
        }}
        onRemove={(index) => {
          form.setValue(
            "tags",
            tags.filter((_, i) => i !== index),
            { shouldDirty: true },
          );
        }}
      />

      <div className="space-y-3">
        <FormError message={errorMessage ?? undefined} />
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} className={cn("min-w-28")}>
            Save recipe
          </Button>
        </div>
      </div>
    </form>
  );
}

export { RECIPE_FORM_ID, toRecipeRequest };
