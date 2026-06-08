import { useEffect, useState } from "react";
import { useCreateRecipe, useImportRecipe } from "@/api";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import type { RecipeDetailApiResponse } from "@/lib/types";
import type { RecipeFormInput } from "@/lib/validations/recipes";
import { RecipeForm, toRecipeRequest } from "./recipe-form";
import { RecipeImportSheet } from "./recipe-import-sheet";

type AddRecipeMode = "choices" | "manual" | "import";

interface RecipeCreateSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (recipeId: string) => void;
  defaultMode?: AddRecipeMode;
  defaultValues?: Partial<RecipeFormInput>;
  onCancel?: () => void;
}

export function RecipeCreateSheet({
  isOpen,
  onOpenChange,
  onCreated,
  defaultMode = "choices",
  defaultValues,
  onCancel,
}: RecipeCreateSheetProps) {
  const [mode, setMode] = useState<AddRecipeMode>(defaultMode);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMode(defaultMode);
      setImportError(null);
    }
  }, [defaultMode, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
    }
  }, [defaultMode, isOpen]);

  const handleSuccess = (response: RecipeDetailApiResponse) => {
    onOpenChange(false);
    onCreated(response.data.id);
  };

  const createRecipe = useCreateRecipe({
    onSuccess: handleSuccess,
  });
  const importRecipe = useImportRecipe({
    onSuccess: (response) => {
      setImportError(null);
      handleSuccess(response);
    },
  });

  // Unified dismissal: if the caller provided onCancel (e.g. a meals draft
  // flow), delegate so it can consume the draft and reset state. Otherwise
  // just close the sheet. Must NOT be used from handleSuccess — the success
  // path keeps onCreated responsible for consuming the draft.
  const dismissFlow = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    onOpenChange(false);
  };

  if (mode === "manual") {
    const createErrorMessage =
      createRecipe.error instanceof Error
        ? createRecipe.error.message
        : "Could not save recipe";

    return (
      <MobileSheet isOpen={isOpen} onClose={dismissFlow} title="Create Recipe">
        <RecipeForm
          defaultValues={defaultValues}
          isPending={createRecipe.isPending}
          errorMessage={createRecipe.isError ? createErrorMessage : null}
          onSubmit={(values) => createRecipe.mutate(toRecipeRequest(values))}
        />
      </MobileSheet>
    );
  }

  if (mode === "import") {
    return (
      <RecipeImportSheet
        isOpen={isOpen}
        isPending={importRecipe.isPending}
        errorMessage={importError}
        onClose={dismissFlow}
        onSubmit={(url) => {
          setImportError(null);
          importRecipe.mutate(
            { url },
            {
              onError: (error) => {
                setImportError(
                  error instanceof Error
                    ? error.message
                    : "Could not import recipe",
                );
              },
            },
          );
        }}
      />
    );
  }

  return (
    <MobileSheet isOpen={isOpen} onClose={dismissFlow} title="Add Recipe">
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="h-auto w-full justify-start px-4 py-4 text-left"
          onClick={() => setMode("manual")}
        >
          Create manually
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-auto w-full justify-start px-4 py-4 text-left"
          onClick={() => setMode("import")}
        >
          Import from URL
        </Button>
      </div>
    </MobileSheet>
  );
}
