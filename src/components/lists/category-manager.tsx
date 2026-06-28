/**
 * CategoryManager — responsive dialog/sheet for managing list categories for a
 * given kind. Handles loading, error, offline, empty, CRUD, reorder, and delete
 * confirmation.
 *
 * Desktop: rendered in a Dialog via ResponsiveFormDialog.
 * Mobile: rendered in a MobileSheet via ResponsiveFormDialog.
 * (Task 11 will add cross-viewport focus props.)
 *
 * Reorder state is OWNED HERE (Task 10):
 *   - isReordering, baselineEntries, baselineIds, draftIds
 *   - Save/Cancel/dirty-close back handler
 *   - The Add form and CategoryManagerList rename/delete are disabled during reorder.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ApiException,
  useCreateListCategory,
  useDeleteListCategory,
  useListCategories,
  useRenameListCategory,
  useReorderListCategories,
} from "@/api";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveFormDialog } from "@/components/ui/responsive-form-dialog";
import { toast } from "@/components/ui/toaster";
import { useBackHandler, useOnlineStatus } from "@/hooks";
import type { ListCategoryManagementEntry, ListKind } from "@/lib/types";
import { categoryNameSchema } from "@/lib/validations/lists";
import { CategoryConfirmDialog } from "./category-confirm-dialog";
import { CategoryManagerList } from "./category-manager-list";

// Wrap the string schema in an object for react-hook-form resolver compatibility
const addCategoryFormSchema = z.object({ name: categoryNameSchema });

const kindLabel: Record<ListKind, string> = {
  grocery: "Grocery",
  "to-do": "To-do",
  general: "General",
};

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ListKind;
}

const ADD_CATEGORY_ERROR_ID = "new-category-name-error";

/**
 * Add-category inline form at the top of the manager content.
 */
function AddCategoryForm({
  kind,
  disabled,
}: {
  kind: ListKind;
  disabled?: boolean;
}) {
  const createCategory = useCreateListCategory();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<{ name: string }>({
    resolver: zodResolver(addCategoryFormSchema),
    defaultValues: { name: "" },
  });

  async function submit(values: { name: string }) {
    setServerError(null);
    try {
      await new Promise<void>((resolve, reject) => {
        createCategory.mutate(
          { kind, name: values.name },
          {
            onSuccess: () => {
              form.setValue("name", "", { shouldValidate: false });
              resolve();
            },
            onError: (err) => reject(err),
          },
        );
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create category. Please try again.";
      setServerError(message);
    }
  }

  const errorMessage = form.formState.errors.name?.message ?? serverError;

  return (
    <form className="space-y-2" onSubmit={form.handleSubmit(submit)}>
      <Label htmlFor="new-category-name">Category name</Label>
      <div className="flex gap-2">
        <Input
          id="new-category-name"
          aria-label="Category name"
          autoComplete="off"
          placeholder="New category…"
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? ADD_CATEGORY_ERROR_ID : undefined}
          disabled={disabled || createCategory.isPending}
          {...form.register("name")}
        />
        <Button
          type="submit"
          size="default"
          disabled={disabled || createCategory.isPending}
          aria-label="Add"
        >
          Add
        </Button>
      </div>
      <FormError
        id={ADD_CATEGORY_ERROR_ID}
        message={errorMessage ?? undefined}
      />
    </form>
  );
}

export function CategoryManager({
  open,
  onOpenChange,
  kind,
}: CategoryManagerProps) {
  const online = useOnlineStatus();
  const categoriesQuery = useListCategories(kind, open);
  const renameCategory = useRenameListCategory();
  const deleteCategory = useDeleteListCategory();
  const reorderCategory = useReorderListCategories();

  // ---------------------------------------------------------------------------
  // Rename state
  // ---------------------------------------------------------------------------
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Delete confirmation state
  // ---------------------------------------------------------------------------
  const [confirmEntry, setConfirmEntry] =
    useState<ListCategoryManagementEntry | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmOpen = confirmEntry !== null;

  // ---------------------------------------------------------------------------
  // Reorder state (Task 10)
  // ---------------------------------------------------------------------------
  const [isReordering, setIsReordering] = useState(false);
  /** Immutable snapshot captured on entry. Render rows from this. */
  const [baselineEntries, setBaselineEntries] = useState<
    ListCategoryManagementEntry[]
  >([]);
  /** Baseline ID array (for expectedCategoryIds in the PUT). */
  const [baselineIds, setBaselineIds] = useState<string[]>([]);
  /** Mutable draft order during reorder. */
  const [draftIds, setDraftIds] = useState<string[]>([]);

  /** Whether the reorder PUT is currently in flight. */
  const reorderPending = reorderCategory.isPending;

  /** True when the draft order differs from the baseline. */
  const isDirty =
    draftIds.length > 0 && !draftIds.every((id, i) => id === baselineIds[i]);

  // ---------------------------------------------------------------------------
  // Dirty-close confirmation (reorder only)
  // ---------------------------------------------------------------------------
  const [reorderDiscardOpen, setReorderDiscardOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Back handlers — order matters (LIFO):
  //   1. Register delete confirmation back handler
  //   2. Register reorder discard confirmation back handler
  //   3. Reorder dirty-close back handler (highest priority when reordering)
  //
  // In practice only the relevant one is enabled at a time.
  // ---------------------------------------------------------------------------
  useBackHandler(confirmOpen, () => setConfirmEntry(null));
  useBackHandler(reorderDiscardOpen, () => setReorderDiscardOpen(false));
  // When reordering with dirty state and no sub-dialog open, hardware back →
  // open the discard confirmation. When clean, just cancel reorder.
  useBackHandler(isReordering && !confirmOpen && !reorderDiscardOpen, () => {
    if (isDirty) {
      setReorderDiscardOpen(true);
    } else {
      exitReorder();
    }
  });

  // ---------------------------------------------------------------------------
  // Reorder helpers
  // ---------------------------------------------------------------------------

  function enterReorder() {
    const currentCategories = categoriesQuery.data?.data.categories ?? [];
    setBaselineEntries(currentCategories);
    setBaselineIds(currentCategories.map((c) => c.id));
    setDraftIds(currentCategories.map((c) => c.id));
    setIsReordering(true);
  }

  function exitReorder() {
    setIsReordering(false);
    setBaselineEntries([]);
    setBaselineIds([]);
    setDraftIds([]);
    setReorderDiscardOpen(false);
  }

  function handleReorderCancel() {
    if (isDirty) {
      setReorderDiscardOpen(true);
    } else {
      exitReorder();
    }
  }

  async function handleReorderSave() {
    try {
      await new Promise<void>((resolve, reject) => {
        reorderCategory.mutate(
          {
            kind,
            expectedCategoryIds: baselineIds,
            categoryIds: draftIds,
          },
          {
            onSuccess: (response) => {
              // Replace baseline from the canonical server response
              const newCategories = response.data.categories;
              setBaselineEntries(newCategories);
              setBaselineIds(newCategories.map((c) => c.id));
              setDraftIds(newCategories.map((c) => c.id));
              exitReorder();
              resolve();
            },
            onError: (err: unknown) => {
              reject(err);
            },
          },
        );
      });
    } catch (err: unknown) {
      // 409 = stale baseline (concurrent create/delete/reorder changed server
      // order). Refetch the canonical order, exit reorder, and explain the change.
      if (ApiException.isApiException(err) && err.status === 409) {
        await categoriesQuery.refetch();
        exitReorder();
        toast({
          title: "Order not saved",
          description:
            "Categories changed elsewhere. Reloaded the latest order.",
          variant: "destructive",
        });
      }
      // Non-409: keep reorder mode + draft (isPending returns to false, Save re-enables)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete handlers
  // ---------------------------------------------------------------------------

  function closeConfirm() {
    setConfirmEntry(null);
  }

  async function handleRename(
    entry: ListCategoryManagementEntry,
    newName: string,
  ): Promise<void> {
    setRenameError(null);
    setPendingRenameId(entry.id);
    try {
      await new Promise<void>((resolve, reject) => {
        renameCategory.mutate(
          { categoryId: entry.id, name: newName },
          {
            onSuccess: () => {
              setRenamingId(null);
              setPendingRenameId(null);
              resolve();
            },
            onError: (err) => {
              setPendingRenameId(null);
              reject(err);
            },
          },
        );
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to rename category. Please try again.";
      setRenameError(message);
    }
  }

  function handleDeleteRequest(entry: ListCategoryManagementEntry) {
    setConfirmEntry(entry);
  }

  function handleDeleteConfirm() {
    if (!confirmEntry) return;
    setPendingDeleteId(confirmEntry.id);

    deleteCategory.mutate(
      { categoryId: confirmEntry.id, kind },
      {
        onSuccess: (response) => {
          setPendingDeleteId(null);
          const { uncategorizedItemCount, flattenedListCount } = response.data;

          let description = `"${confirmEntry.name}" was deleted.`;
          if (uncategorizedItemCount > 0) {
            description += ` ${uncategorizedItemCount} ${uncategorizedItemCount === 1 ? "item" : "items"} became uncategorized.`;
          }
          if (flattenedListCount > 0) {
            description += ` ${flattenedListCount} ${flattenedListCount === 1 ? "list" : "lists"} switched to flat view.`;
          }

          closeConfirm();
          toast({ title: "Category deleted", description });
        },
        onError: () => {
          setPendingDeleteId(null);
          // Keep confirmation open for retry — do not close confirmEntry
          toast({
            title: "Delete failed",
            description: "Could not delete the category. Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  }

  // Build confirmation dialog body with preflight counts
  const confirmBody = confirmEntry ? (
    <p>
      Delete &ldquo;{confirmEntry.name}&rdquo;?{" "}
      {confirmEntry.itemCount > 0 && (
        <>
          {confirmEntry.itemCount}{" "}
          {confirmEntry.itemCount === 1 ? "item" : "items"} across your{" "}
          {kindLabel[kind]} lists will become Uncategorized.
        </>
      )}
    </p>
  ) : null;

  // Manager content — shared between desktop and mobile via ResponsiveFormDialog
  const managerContent = (
    <div className="space-y-5 pb-2">
      {/* Shared-scope copy */}
      <p className="text-sm text-muted-foreground">
        Available across all {kindLabel[kind]} lists in your family.
      </p>

      {!online && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium">Unavailable offline</p>
          <p className="mt-1">
            Category management requires an internet connection. Your existing
            lists remain readable.
          </p>
        </div>
      )}

      {online && (
        <>
          {/* Add form — disabled during reorder */}
          <AddCategoryForm kind={kind} disabled={isReordering} />

          {/* Category list */}
          {categoriesQuery.isPending && (
            <div
              className="space-y-2"
              role="status"
              aria-label="Loading categories"
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-muted"
                />
              ))}
              <p className="sr-only">Loading categories…</p>
            </div>
          )}

          {categoriesQuery.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">
                Could not load categories.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => categoriesQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          )}

          {categoriesQuery.isSuccess &&
            (categoriesQuery.data.data.categories.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="font-medium text-foreground">No categories yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a category above, or create one while adding an item.
                </p>
              </div>
            ) : (
              <>
                {/* Reorder mode Save/Cancel bar */}
                {isReordering && (
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <p className="text-sm font-semibold text-foreground">
                      Reorder categories
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleReorderCancel}
                        disabled={reorderPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleReorderSave}
                        disabled={!isDirty || reorderPending}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                <CategoryManagerList
                  categories={categoriesQuery.data.data.categories}
                  onDeleteRequest={handleDeleteRequest}
                  onRename={handleRename}
                  renamingId={renamingId}
                  onRenameStart={(entry) => {
                    setRenamingId(entry.id);
                    setRenameError(null);
                  }}
                  onRenameCancel={() => {
                    setRenamingId(null);
                    setRenameError(null);
                  }}
                  renameError={renameError}
                  pendingDeleteId={pendingDeleteId}
                  pendingRenameId={pendingRenameId}
                  isReordering={isReordering}
                  onEnterReorder={enterReorder}
                  baselineEntries={baselineEntries}
                  draftIds={draftIds}
                  onDraftIdsChange={setDraftIds}
                  reorderPending={reorderPending}
                />
              </>
            ))}
        </>
      )}
    </div>
  );

  return (
    <>
      <ResponsiveFormDialog
        open={open}
        onOpenChange={(newOpen) => {
          // While reorder PUT is pending, ignore close requests
          if (!newOpen && reorderPending) return;
          // While reordering with dirty state, open discard confirmation instead
          if (!newOpen && isReordering && isDirty) {
            setReorderDiscardOpen(true);
            return;
          }
          // Clean reorder: exit cleanly before closing
          if (!newOpen && isReordering) {
            exitReorder();
          }
          onOpenChange(newOpen);
        }}
        title={`${kindLabel[kind]} categories`}
        dialogClassName="max-w-md max-h-[90dvh] overflow-y-auto"
        desktopHeaderRight={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (reorderPending) return;
              if (isReordering && isDirty) {
                setReorderDiscardOpen(true);
                return;
              }
              if (isReordering) exitReorder();
              onOpenChange(false);
            }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        }
      >
        {managerContent}
      </ResponsiveFormDialog>

      {/* Delete confirmation — nested dialog */}
      {confirmEntry && (
        <CategoryConfirmDialog
          open={confirmOpen}
          onOpenChange={(newOpen) => {
            if (!newOpen) closeConfirm();
          }}
          title={`Delete "${confirmEntry.name}"?`}
          confirmLabel="Delete"
          pendingLabel="Deleting…"
          destructive
          isPending={pendingDeleteId === confirmEntry.id}
          onConfirm={handleDeleteConfirm}
        >
          {confirmBody}
        </CategoryConfirmDialog>
      )}

      {/* Reorder dirty-close confirmation */}
      {reorderDiscardOpen && (
        <CategoryConfirmDialog
          open={reorderDiscardOpen}
          onOpenChange={(newOpen) => {
            if (!newOpen) setReorderDiscardOpen(false);
          }}
          title="Discard order?"
          confirmLabel="Discard order"
          cancelLabel="Keep editing"
          onConfirm={() => {
            exitReorder();
            onOpenChange(false);
          }}
        >
          <p>Your reorder changes will be lost.</p>
        </CategoryConfirmDialog>
      )}
    </>
  );
}
