import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  type RecipeFormData,
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

function ArrayFieldSection({
  legend,
  values,
  onChange,
  onAdd,
}: {
  legend: string;
  values: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
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
          <Input
            key={`${singular}-${index}`}
            aria-label={`${singular} ${index + 1}`}
            value={value}
            onChange={(event) => onChange(index, event.target.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}

interface RecipeFormProps {
  onSubmit: (data: RecipeFormData) => void;
  isPending?: boolean;
  errorMessage?: string | null;
}

export function RecipeForm({
  onSubmit,
  isPending = false,
  errorMessage = null,
}: RecipeFormProps) {
  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      title: "",
      ingredients: ensureMinimumLines(undefined),
      instructions: ensureMinimumLines(undefined),
      tags: ensureMinimumLines(undefined),
      favorite: false,
    },
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

  return (
    <form
      id={RECIPE_FORM_ID}
      className="space-y-6"
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

      <ArrayFieldSection
        legend="Ingredients"
        values={ingredients}
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
      />

      <ArrayFieldSection
        legend="Instructions"
        values={instructions}
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
      />

      <ArrayFieldSection
        legend="Tags"
        values={tags}
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
