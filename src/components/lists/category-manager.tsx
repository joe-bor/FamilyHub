/**
 * CategoryManager — responsive dialog/sheet for managing list categories for a
 * given kind. Handles loading, error, offline, empty, CRUD, and delete confirmation.
 *
 * Desktop: rendered in a Dialog via ResponsiveFormDialog.
 * Mobile: rendered in a MobileSheet via ResponsiveFormDialog.
 * (Task 11 will add cross-viewport focus props.)
 *
 * Reorder mechanics are Task 10 — only the entry button is present here.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  useCreateListCategory,
  useDeleteListCategory,
  useListCategories,
  useRenameListCategory,
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

/**
 * Add-category inline form at the top of the manager content.
 */
function AddCategoryForm({
  kind,
  onAdded,
}: {
  kind: ListKind;
  onAdded: () => void;
}) {
  const createCategory = useCreateListCategory();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<{ name: string }>({
    resolver: zodResolver(addCategoryFormSchema),
    defaultValues: { name: "" },
  });
  const nameValue = form.watch("name") ?? "";

  async function submit(values: { name: string }) {
    setServerError(null);
    try {
      await new Promise<void>((resolve, reject) => {
        createCategory.mutate(
          { kind, name: values.name },
          {
            onSuccess: () => {
              form.reset({ name: "" });
              onAdded();
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

  return (
    <form className="space-y-2" onSubmit={form.handleSubmit(submit)}>
      <Label htmlFor="new-category-name">Category name</Label>
      <div className="flex gap-2">
        <Input
          id="new-category-name"
          aria-label="Category name"
          autoComplete="off"
          placeholder="New category…"
          value={nameValue}
          onChange={(e) => form.setValue("name", e.target.value)}
        />
        <Button
          type="submit"
          size="default"
          disabled={createCategory.isPending}
          aria-label="Add"
        >
          Add
        </Button>
      </div>
      {(form.formState.errors.name?.message || serverError) && (
        <FormError
          message={
            form.formState.errors.name?.message ?? serverError ?? undefined
          }
        />
      )}
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

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);

  // Delete confirmation state
  const [confirmEntry, setConfirmEntry] =
    useState<ListCategoryManagementEntry | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmOpen = confirmEntry !== null;

  // Register back handler: hardware back closes confirmation before manager
  useBackHandler(confirmOpen, () => setConfirmEntry(null));

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
          {/* Add form */}
          <AddCategoryForm kind={kind} onAdded={() => {}} />

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

          {categoriesQuery.isSuccess && (
            <>
              {categoriesQuery.data.data.categories.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="font-medium text-foreground">
                    No categories yet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a category above, or create one while adding an item.
                  </p>
                </div>
              ) : (
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
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <ResponsiveFormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`${kindLabel[kind]} categories`}
        dialogClassName="max-w-md max-h-[90dvh] overflow-y-auto"
        desktopHeaderRight={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
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
          destructive
          isPending={pendingDeleteId === confirmEntry.id}
          onConfirm={handleDeleteConfirm}
        >
          {confirmBody}
        </CategoryConfirmDialog>
      )}
    </>
  );
}
