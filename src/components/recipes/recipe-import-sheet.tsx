import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MobileSheet } from "@/components/ui/mobile-sheet";

function isHttpOrHttpsUrl(value: string) {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

const recipeImportSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Recipe URL is required")
    .url("Enter a valid URL")
    .refine(isHttpOrHttpsUrl, "Enter an http or https URL"),
});

type RecipeImportFormData = z.infer<typeof recipeImportSchema>;

interface RecipeImportSheetProps {
  isOpen: boolean;
  isPending?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (url: string) => void;
}

export function RecipeImportSheet({
  isOpen,
  isPending = false,
  errorMessage = null,
  onClose,
  onSubmit,
}: RecipeImportSheetProps) {
  const form = useForm<RecipeImportFormData>({
    resolver: zodResolver(recipeImportSchema),
    defaultValues: { url: "" },
  });

  return (
    <MobileSheet isOpen={isOpen} onClose={onClose} title="Import Recipe">
      <form
        className="space-y-6"
        noValidate
        onSubmit={form.handleSubmit((values) => onSubmit(values.url))}
      >
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>
          Import recipe
        </button>

        <div className="space-y-2">
          <Label htmlFor="recipe-import-url">Recipe URL</Label>
          <Input
            id="recipe-import-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            placeholder="https://example.com/recipe"
            aria-invalid={Boolean(form.formState.errors.url)}
            {...form.register("url")}
          />
          <FormError message={form.formState.errors.url?.message} />
          <FormError message={errorMessage ?? undefined} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} className="min-w-32">
            Import recipe
          </Button>
        </div>
      </form>
    </MobileSheet>
  );
}
