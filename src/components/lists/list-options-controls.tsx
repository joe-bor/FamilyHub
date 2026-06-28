import { Settings, Trash2 } from "lucide-react";
import type {
  ListCategoryDisplayMode,
  ListDetail,
  ListKind,
  UpdateListRequest,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Label } from "../ui/label";

const kindLabel: Record<ListKind, string> = {
  grocery: "Grocery",
  "to-do": "To-do",
  general: "General",
};

interface ListOptionsControlsProps {
  list: ListDetail;
  hasPreferences: boolean;
  familyShowCompletedDefault: boolean;
  completedControlsDisabled: boolean;
  completedOverrideValue: "family-default" | "show" | "hide";
  completedFallbackMessage: string;
  clearCompletedDisabled: boolean;
  /** Stack the clear-completed action full-width (used inside the mobile sheet). */
  fullWidthClearButton?: boolean;
  /** Called when the user clicks "Manage categories". Parent opens the manager. */
  onManageCategories?: () => void;
  /**
   * Whether the user is online. When false, "Manage categories" is disabled
   * and explanatory copy is shown.
   */
  categoriesOnline?: boolean;
  onUpdateList: (request: UpdateListRequest) => void;
  onUpdatePreferences: (request: { showCompletedByDefault: boolean }) => void;
  onClearCompleted: () => void;
}

export function ListOptionsControls({
  list,
  hasPreferences,
  familyShowCompletedDefault,
  completedControlsDisabled,
  completedOverrideValue,
  completedFallbackMessage,
  clearCompletedDisabled,
  fullWidthClearButton = false,
  onManageCategories,
  categoriesOnline = true,
  onUpdateList,
  onUpdatePreferences,
  onClearCompleted,
}: ListOptionsControlsProps) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="category-mode">Categories</Label>
          <select
            id="category-mode"
            value={list.categoryDisplayMode}
            onChange={(event) =>
              onUpdateList({
                categoryDisplayMode: event.target
                  .value as ListCategoryDisplayMode,
                showCompletedOverride: list.showCompletedOverride,
              })
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[15px] leading-5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="grouped" disabled={list.categories.length === 0}>
              Show categories
            </option>
            <option value="flat">Hide categories</option>
          </select>
          {list.categories.length === 0 && (
            <p className="text-xs leading-4 text-muted-foreground">
              Create a category first.
            </p>
          )}
          {onManageCategories !== undefined && (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onManageCategories}
                disabled={!categoriesOnline}
                aria-label="Manage categories"
              >
                <Settings className="h-4 w-4" />
                Manage categories
              </Button>
              <p className="mt-1 text-xs leading-4 text-muted-foreground">
                {categoriesOnline
                  ? `Available across all ${kindLabel[list.kind]} lists in your family.`
                  : "Category management is unavailable while offline."}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="completed-items">Completed items</Label>
          <select
            id="completed-items"
            value={completedOverrideValue}
            disabled={completedControlsDisabled}
            onChange={(event) =>
              onUpdateList({
                categoryDisplayMode: list.categoryDisplayMode,
                showCompletedOverride:
                  event.target.value === "family-default"
                    ? null
                    : event.target.value === "show",
              })
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[15px] leading-5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="family-default">
              Family default (
              {hasPreferences
                ? familyShowCompletedDefault
                  ? "show"
                  : "hide"
                : "show for now"}
              )
            </option>
            <option value="show">Always show</option>
            <option value="hide">Hide completed</option>
          </select>
          {completedControlsDisabled && (
            <p className="text-xs leading-4 text-muted-foreground">
              {completedFallbackMessage}
            </p>
          )}
        </div>
      </div>

      <div
        className={cn(
          "mt-4 flex flex-wrap items-center justify-between gap-3",
          fullWidthClearButton && "flex-col items-stretch",
        )}
      >
        <label
          htmlFor="family-completed-default"
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <input
            id="family-completed-default"
            type="checkbox"
            checked={familyShowCompletedDefault}
            disabled={completedControlsDisabled}
            onChange={(event) =>
              onUpdatePreferences({
                showCompletedByDefault: event.target.checked,
              })
            }
            className="h-4 w-4 rounded border-border"
          />
          Show completed by default
        </label>
        <Button
          type="button"
          variant="outline"
          onClick={onClearCompleted}
          disabled={clearCompletedDisabled}
          className={cn(fullWidthClearButton && "w-full")}
        >
          <Trash2 className="h-4 w-4" />
          Remove all completed
        </Button>
      </div>
    </>
  );
}
