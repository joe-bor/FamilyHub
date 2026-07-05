import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useMemo, useState } from "react";
import { recipesKeys } from "@/api/hooks/use-recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { BulkCreateListItemsRequest, MealBoard } from "@/lib/types";
import {
  buildReviewModel,
  distinctRecipeIds,
  type ReviewModel,
  type ReviewRow,
  toBulkItemsRequest,
} from "./meal-ingredient-extraction";
import { useRecipeDetails } from "./use-recipe-details";

const OFFLINE_COPY =
  "You're offline. Review your ingredients now and add them to your list when you're back online.";

interface AddIngredientsSheetProps {
  isOpen: boolean;
  board: MealBoard;
  onOpenChange: (open: boolean) => void;
  /**
   * Task 6 seam: invoked by "Add to list" with the reviewed rows. Task 6 wires
   * this to the grocery-list picker/create + `useBulkCreateListItems`. Task 5
   * only owns the review UI and the local {@link ReviewModel}.
   */
  onConfirm: (request: BulkCreateListItemsRequest) => void;
  /** Task 6 seam: reflects the append mutation being in flight. */
  isSubmitting?: boolean;
  /**
   * Task 6 seam: an extra disable condition owned by the container (e.g. no
   * target grocery list chosen yet). OR-ed with the sheet's own guards
   * (offline / nothing selected / submitting). Purely presentational.
   */
  confirmDisabled?: boolean;
  /**
   * Task 6 seam: an optional slot for the list picker/create affordance the
   * next task renders above the confirm action.
   */
  listPicker?: ReactNode;
}

let manualRowSeq = 0;
function nextManualRowId(): string {
  manualRowSeq += 1;
  return `manual-${manualRowSeq}`;
}

function hasSelectedRow(model: ReviewModel): boolean {
  const anyRecipe = model.recipeGroups.some((group) =>
    group.rows.some((row) => row.selected && row.text.trim().length > 0),
  );
  if (anyRecipe) return true;
  return model.noIngredientGroups.some((group) =>
    group.manualRows.some((row) => row.selected && row.text.trim().length > 0),
  );
}

type GroupStatus = "recipe" | "none" | "error";

/** Map every group key in a model to its resolution bucket. */
function statusByKey(model: ReviewModel): Map<string, GroupStatus> {
  const map = new Map<string, GroupStatus>();
  for (const group of model.recipeGroups) map.set(group.key, "recipe");
  for (const group of model.noIngredientGroups) map.set(group.key, "none");
  for (const group of model.errorGroups) map.set(group.key, "error");
  return map;
}

/**
 * Merge a freshly-built review model into the current (possibly edited) one.
 *
 * A meal's group appears in exactly one bucket per model. For each group in the
 * fresh model, if the SAME key had the SAME bucket in the current model, we keep
 * the current group verbatim — preserving the user's edits, removals,
 * deselections, and appended manual rows. Only groups whose resolution actually
 * changed (e.g. error → recipe after a successful Retry) or that are newly
 * present adopt the freshly-built group. This is what lets Retry recover one
 * meal's rows without discarding edits in every other meal.
 */
function mergeReviewModel(
  current: ReviewModel,
  fresh: ReviewModel,
): ReviewModel {
  const currentStatus = statusByKey(current);
  const currentRecipe = new Map(current.recipeGroups.map((g) => [g.key, g]));
  const currentNone = new Map(
    current.noIngredientGroups.map((g) => [g.key, g]),
  );
  const currentError = new Map(current.errorGroups.map((g) => [g.key, g]));

  return {
    recipeGroups: fresh.recipeGroups.map((group) =>
      currentStatus.get(group.key) === "recipe"
        ? (currentRecipe.get(group.key) ?? group)
        : group,
    ),
    noIngredientGroups: fresh.noIngredientGroups.map((group) =>
      currentStatus.get(group.key) === "none"
        ? (currentNone.get(group.key) ?? group)
        : group,
    ),
    errorGroups: fresh.errorGroups.map((group) =>
      currentStatus.get(group.key) === "error"
        ? (currentError.get(group.key) ?? group)
        : group,
    ),
  };
}

export function AddIngredientsSheet({
  isOpen,
  board,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
  confirmDisabled = false,
  listPicker,
}: AddIngredientsSheetProps) {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();

  const recipeIds = useMemo(() => distinctRecipeIds(board), [board]);
  const { resolutionsById, isLoading } = useRecipeDetails(recipeIds);

  // Re-sync the local review model when the underlying resolutions change
  // (initial load, or a retry moving a meal out of the error state). Crucially
  // we MERGE rather than rebuild: only the group(s) whose resolution actually
  // changed (or are newly present) adopt freshly-built rows; every other group
  // keeps the user's in-progress edits/removals/deselections and manual rows.
  // Between resolution changes the local model is authoritative.
  const resolutionKey = recipeIds
    .map((id) => `${id}:${resolutionsById[id]?.status ?? "pending"}`)
    .join("|");
  const [model, setModel] = useState<ReviewModel>(() =>
    buildReviewModel(board, resolutionsById),
  );
  const [syncedKey, setSyncedKey] = useState(resolutionKey);
  if (!isLoading && resolutionKey !== syncedKey) {
    setModel((current) =>
      mergeReviewModel(current, buildReviewModel(board, resolutionsById)),
    );
    setSyncedKey(resolutionKey);
  }

  function editRecipeRow(groupKey: string, rowId: string, text: string) {
    setModel((current) => ({
      ...current,
      recipeGroups: current.recipeGroups.map((group) =>
        group.key === groupKey
          ? {
              ...group,
              rows: group.rows.map((row) =>
                row.id === rowId ? { ...row, text } : row,
              ),
            }
          : group,
      ),
    }));
  }

  function toggleRecipeRow(groupKey: string, rowId: string) {
    setModel((current) => ({
      ...current,
      recipeGroups: current.recipeGroups.map((group) =>
        group.key === groupKey
          ? {
              ...group,
              rows: group.rows.map((row) =>
                row.id === rowId ? { ...row, selected: !row.selected } : row,
              ),
            }
          : group,
      ),
    }));
  }

  function removeRecipeRow(groupKey: string, rowId: string) {
    setModel((current) => ({
      ...current,
      recipeGroups: current.recipeGroups.map((group) =>
        group.key === groupKey
          ? { ...group, rows: group.rows.filter((row) => row.id !== rowId) }
          : group,
      ),
    }));
  }

  function addManualRow(groupKey: string) {
    setModel((current) => ({
      ...current,
      noIngredientGroups: current.noIngredientGroups.map((group) =>
        group.key === groupKey
          ? {
              ...group,
              manualRows: [
                ...group.manualRows,
                { id: nextManualRowId(), text: "", selected: true },
              ],
            }
          : group,
      ),
    }));
  }

  function editManualRow(groupKey: string, rowId: string, text: string) {
    setModel((current) => ({
      ...current,
      noIngredientGroups: current.noIngredientGroups.map((group) =>
        group.key === groupKey
          ? {
              ...group,
              manualRows: group.manualRows.map((row) =>
                row.id === rowId ? { ...row, text } : row,
              ),
            }
          : group,
      ),
    }));
  }

  function toggleManualRow(groupKey: string, rowId: string) {
    setModel((current) => ({
      ...current,
      noIngredientGroups: current.noIngredientGroups.map((group) =>
        group.key === groupKey
          ? {
              ...group,
              manualRows: group.manualRows.map((row) =>
                row.id === rowId ? { ...row, selected: !row.selected } : row,
              ),
            }
          : group,
      ),
    }));
  }

  function removeManualRow(groupKey: string, rowId: string) {
    setModel((current) => ({
      ...current,
      noIngredientGroups: current.noIngredientGroups.map((group) =>
        group.key === groupKey
          ? {
              ...group,
              manualRows: group.manualRows.filter((row) => row.id !== rowId),
            }
          : group,
      ),
    }));
  }

  function retryRecipe(recipeId: string) {
    queryClient.invalidateQueries({ queryKey: recipesKeys.detail(recipeId) });
  }

  const anySelected = hasSelectedRow(model);
  const addDisabled =
    !online || isSubmitting || confirmDisabled || !anySelected;

  function handleConfirm() {
    // Belt-and-suspenders: the button is disabled when nothing is selected, but
    // never emit an empty append even if that invariant is bypassed.
    if (!anySelected) return;
    onConfirm(toBulkItemsRequest(model));
  }

  return (
    <MobileSheet
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      title="Add ingredients to grocery list"
      initialHeight="full"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading recipe ingredients…
        </p>
      ) : (
        <div className="space-y-6">
          {model.errorGroups.length > 0 ? (
            <ul className="space-y-2">
              {model.errorGroups.map((group) => (
                <li
                  key={group.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {group.label}
                    </p>
                    <p className="text-xs text-destructive">
                      Couldn't load this recipe's ingredients.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Retry loading ${group.label}`}
                    onClick={() => retryRecipe(group.recipeId)}
                  >
                    Retry
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          {model.recipeGroups.map((group) => (
            <section key={group.key} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                {group.label}
              </h3>
              <ul className="space-y-2">
                {group.rows.map((row) => (
                  <RowEditor
                    key={row.id}
                    row={row}
                    ariaLabel={row.text || "Ingredient"}
                    onToggle={() => toggleRecipeRow(group.key, row.id)}
                    onEdit={(text) => editRecipeRow(group.key, row.id, text)}
                    onRemove={() => removeRecipeRow(group.key, row.id)}
                  />
                ))}
              </ul>
            </section>
          ))}

          {model.noIngredientGroups.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                No recipe ingredients
              </h3>
              <ul className="space-y-3">
                {model.noIngredientGroups.map((group) => (
                  <li key={group.key} className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {group.label}
                    </p>
                    {group.manualRows.length > 0 ? (
                      <ul className="space-y-2">
                        {group.manualRows.map((row) => (
                          <RowEditor
                            key={row.id}
                            row={row}
                            ariaLabel="Manual item"
                            placeholder="Add an item"
                            onToggle={() => toggleManualRow(group.key, row.id)}
                            onEdit={(text) =>
                              editManualRow(group.key, row.id, text)
                            }
                            onRemove={() => removeManualRow(group.key, row.id)}
                          />
                        ))}
                      </ul>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      aria-label={`Add item for ${group.label}`}
                      onClick={() => addManualRow(group.key)}
                    >
                      + Add item
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Task 6 seam: grocery-list picker / create affordance. */}
          {listPicker}

          {!online ? (
            <p className="text-sm text-muted-foreground" role="status">
              {OFFLINE_COPY}
            </p>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={addDisabled}
            onClick={handleConfirm}
          >
            Add to list
          </Button>
        </div>
      )}
    </MobileSheet>
  );
}

interface RowEditorProps {
  row: ReviewRow;
  ariaLabel: string;
  placeholder?: string;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onRemove: () => void;
}

function RowEditor({
  row,
  ariaLabel,
  placeholder,
  onToggle,
  onEdit,
  onRemove,
}: RowEditorProps) {
  return (
    <li className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={row.selected}
        onChange={onToggle}
        aria-label={`Include ${ariaLabel}`}
        className="h-4 w-4 shrink-0 accent-primary"
      />
      <Input
        value={row.text}
        placeholder={placeholder}
        aria-label={`Edit ${ariaLabel}`}
        onChange={(event) => onEdit(event.target.value)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Remove ${ariaLabel}`}
        onClick={onRemove}
      >
        Remove
      </Button>
    </li>
  );
}
