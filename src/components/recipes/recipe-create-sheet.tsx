import { useEffect, useState } from "react";
import { useCreateRecipe, useImportRecipe } from "@/api";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import type { RecipeDetailApiResponse } from "@/lib/types";
import { RecipeForm, toRecipeRequest } from "./recipe-form";
import { RecipeImportSheet } from "./recipe-import-sheet";

type AddRecipeMode = "choices" | "manual" | "import";

interface RecipeCreateSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (recipeId: string) => void;
}

export function RecipeCreateSheet({
  isOpen,
  onOpenChange,
  onCreated,
}: RecipeCreateSheetProps) {
  const [mode, setMode] = useState<AddRecipeMode>("choices");
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMode("choices");
      setImportError(null);
    }
  }, [isOpen]);

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

  const goBackToChoices = () => {
    setMode("choices");
    setImportError(null);
  };

  if (mode === "manual") {
    return (
      <MobileSheet
        isOpen={isOpen}
        onClose={goBackToChoices}
        title="Create Recipe"
      >
        <RecipeForm
          isPending={createRecipe.isPending}
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
        onBack={goBackToChoices}
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
    <MobileSheet
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      title="Add Recipe"
    >
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
