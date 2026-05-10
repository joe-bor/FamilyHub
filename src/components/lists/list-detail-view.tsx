import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useClearCompleted,
  useDeleteListItem,
  useList,
  useUpdateList,
  useUpdateListItem,
  useUpdateListPreferences,
} from "@/api";
import type {
  ListCategoryDisplayMode,
  ListItem,
  ListPreferences,
} from "@/lib/types";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { buildListSections } from "./build-list-sections";
import { ListItemRow } from "./list-item-row";
import { ListItemSheet } from "./list-item-sheet";

const kindLabels = {
  grocery: "Grocery",
  "to-do": "To-do",
  general: "General",
} as const;

interface ListDetailViewProps {
  listId: string;
  preferences: ListPreferences | null;
  preferencesStatus: "ready" | "loading" | "error" | "unavailable";
  onBack: () => void;
}

export function ListDetailView({
  listId,
  preferences,
  preferencesStatus,
  onBack,
}: ListDetailViewProps) {
  const listQuery = useList(listId);
  const updateList = useUpdateList(listId);
  const updateItem = useUpdateListItem(listId);
  const deleteItem = useDeleteListItem(listId);
  const clearCompleted = useClearCompleted(listId);
  const updatePreferences = useUpdateListPreferences();
  const [itemSheet, setItemSheet] = useState<{
    mode: "create" | "edit";
    item: ListItem | null;
  } | null>(null);

  if (listQuery.isLoading) {
    return (
      <div className="flex-1 p-4 text-sm text-muted-foreground">
        Loading list
      </div>
    );
  }

  if (!listQuery.data?.data) {
    return (
      <div className="flex-1 p-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to Lists
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">
          This list could not be loaded.
        </p>
      </div>
    );
  }

  const list = listQuery.data.data;
  const hasPreferences = preferences !== null;
  const familyShowCompletedDefault =
    preferences?.showCompletedByDefault ?? true;
  const completedControlsDisabled = !hasPreferences;
  const resolvedShowCompleted =
    list.showCompletedOverride ?? familyShowCompletedDefault;
  const sections = buildListSections({
    list,
    showCompleted: resolvedShowCompleted,
  });
  const visibleItemCount = sections.reduce(
    (count, section) => count + section.items.length,
    0,
  );
  const completedOverrideValue =
    list.showCompletedOverride === null
      ? "family-default"
      : list.showCompletedOverride
        ? "show"
        : "hide";
  const completedFallbackMessage =
    preferencesStatus === "loading"
      ? "Family completed default is loading. Completed items are shown until it loads."
      : "Family completed default is unavailable. Completed items are shown until it loads.";
  const clearCompletedDisabled =
    !list.items.some((item) => item.completed) ||
    updateItem.isPending ||
    clearCompleted.isPending;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <Button type="button" variant="ghost" onClick={onBack} className="px-0">
          <ArrowLeft className="h-4 w-4" />
          Back to Lists
        </Button>

        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {kindLabels[list.kind]}
              </p>
              <h2 className="mt-1 break-words text-[22px] font-semibold leading-7 text-foreground">
                {list.name}
              </h2>
            </div>
            <Button
              type="button"
              onClick={() => setItemSheet({ mode: "create", item: null })}
            >
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {list.kind !== "general" && (
              <div className="space-y-1">
                <Label htmlFor="category-mode">Categories</Label>
                <select
                  id="category-mode"
                  value={list.categoryDisplayMode}
                  onChange={(event) =>
                    updateList.mutate({
                      categoryDisplayMode: event.target
                        .value as ListCategoryDisplayMode,
                      showCompletedOverride: list.showCompletedOverride,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[15px] leading-5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="grouped">Show categories</option>
                  <option value="flat">Hide categories</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="completed-items">Completed items</Label>
              <select
                id="completed-items"
                value={completedOverrideValue}
                disabled={completedControlsDisabled}
                onChange={(event) =>
                  updateList.mutate({
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
                  updatePreferences.mutate({
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
              onClick={() => clearCompleted.mutate()}
              disabled={clearCompletedDisabled}
            >
              <Trash2 className="h-4 w-4" />
              Remove all completed
            </Button>
          </div>
        </div>

        {list.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">
              No items yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted-foreground">
              Add the first item to get this list moving.
            </p>
          </div>
        ) : visibleItemCount === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">
              No active items
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted-foreground">
              Completed items are hidden for this list.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <section key={section.id} className="space-y-2">
                {section.title && (
                  <h3 className="px-1 text-sm font-semibold uppercase text-muted-foreground">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <ListItemRow
                      key={item.id}
                      item={item}
                      onToggle={(completed) =>
                        updateItem.mutate({
                          itemId: item.id,
                          request: {
                            text: item.text,
                            completed,
                            categoryId: item.categoryId,
                          },
                        })
                      }
                      onEdit={() => setItemSheet({ mode: "edit", item })}
                      onDelete={() => deleteItem.mutate(item.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <ListItemSheet
          open={itemSheet !== null}
          mode={itemSheet?.mode ?? "create"}
          list={list}
          item={itemSheet?.item ?? null}
          onOpenChange={(open) => {
            if (!open) setItemSheet(null);
          }}
        />
      </div>
    </div>
  );
}
