/**
 * CategoryManagerList — renders ordered rows with name, itemCount, inline rename,
 * delete action, and a Reorder entry stub (mechanics are Task 10).
 *
 * Scope: Task 9. Reorder mechanics (drag/save/aria/dirty-close) are NOT
 * implemented here — the Reorder button exists and switches local `reordering`
 * state, but the reorder mode is a minimal read-only placeholder.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import type { ListCategoryManagementEntry } from "@/lib/types";
import { categoryNameSchema } from "@/lib/validations/lists";

const renameCategoryFormSchema = z.object({ name: categoryNameSchema });

interface CategoryManagerListProps {
  categories: ListCategoryManagementEntry[];
  /**
   * Called when the user clicks the Delete button on a row.
   * The parent opens the confirm dialog.
   */
  onDeleteRequest: (entry: ListCategoryManagementEntry) => void;
  /**
   * Called when the user submits a rename for a row.
   * Receives the entry and new name; parent fires the mutation.
   */
  onRename: (
    entry: ListCategoryManagementEntry,
    newName: string,
  ) => Promise<void>;
  /** ID of the category currently being renamed (if any). */
  renamingId?: string | null;
  onRenameStart: (entry: ListCategoryManagementEntry) => void;
  onRenameCancel: () => void;
  /** Server error message to show adjacent to the active rename input. */
  renameError?: string | null;
  /**
   * When non-null, the Add button for this category id is pending.
   * (Not used here but reserved for parent to gate delete/rename while relevant.)
   */
  pendingDeleteId?: string | null;
  pendingRenameId?: string | null;
}

/** Single row inside the manager list. */
function CategoryRow({
  entry,
  isRenaming,
  onDeleteRequest,
  onRename,
  onRenameStart,
  onRenameCancel,
  renameError,
  pendingDeleteId,
  pendingRenameId,
}: {
  entry: ListCategoryManagementEntry;
  isRenaming: boolean;
  onDeleteRequest: (entry: ListCategoryManagementEntry) => void;
  onRename: (
    entry: ListCategoryManagementEntry,
    newName: string,
  ) => Promise<void>;
  onRenameStart: (entry: ListCategoryManagementEntry) => void;
  onRenameCancel: () => void;
  renameError?: string | null;
  pendingDeleteId?: string | null;
  pendingRenameId?: string | null;
}) {
  const isDeletePending = pendingDeleteId === entry.id;
  const isRenamePending = pendingRenameId === entry.id;

  const renameForm = useForm<{ name: string }>({
    resolver: zodResolver(renameCategoryFormSchema),
    defaultValues: { name: entry.name },
  });

  async function submitRename(values: { name: string }) {
    await onRename(entry, values.name);
  }

  // When entering rename mode, reset the form with the current name
  // (handled by parent via isRenaming toggling; form defaults update via reset)
  if (isRenaming) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
        <form
          id={`rename-form-${entry.id}`}
          className="min-w-0 flex-1"
          onSubmit={renameForm.handleSubmit(submitRename)}
        >
          <Input
            aria-label="Rename category"
            defaultValue={entry.name}
            autoComplete="off"
            {...renameForm.register("name")}
          />
          {(renameError || renameForm.formState.errors.name?.message) && (
            <FormError
              message={renameError ?? renameForm.formState.errors.name?.message}
            />
          )}
        </form>
        <Button
          type="submit"
          form={`rename-form-${entry.id}`}
          size="sm"
          disabled={isRenamePending}
        >
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRenameCancel}
          disabled={isRenamePending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{entry.name}</p>
        <p className="text-xs text-muted-foreground">
          {entry.itemCount === 1 ? "1 item" : `${entry.itemCount} items`}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Rename ${entry.name}`}
        onClick={() => onRenameStart(entry)}
        disabled={isDeletePending || isRenamePending}
      >
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Rename</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${entry.name}`}
        onClick={() => onDeleteRequest(entry)}
        disabled={isDeletePending || isRenamePending}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  );
}

export function CategoryManagerList({
  categories,
  onDeleteRequest,
  onRename,
  renamingId,
  onRenameStart,
  onRenameCancel,
  renameError,
  pendingDeleteId,
  pendingRenameId,
}: CategoryManagerListProps) {
  const [isReorderMode, setIsReorderMode] = useState(false);

  if (isReorderMode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm font-semibold text-foreground">
            Reorder categories
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsReorderMode(false)}
          >
            Done
          </Button>
        </div>
        {/* Reorder mechanics are Task 10. This is a minimal placeholder. */}
        {categories.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-muted-foreground"
          >
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
              {entry.name}
            </span>
            <span className="text-xs">
              {entry.itemCount === 1 ? "1 item" : `${entry.itemCount} items`}
            </span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Reorder mechanics are coming soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          {categories.length === 1
            ? "1 category"
            : `${categories.length} categories`}
        </p>
        {categories.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsReorderMode(true)}
            aria-label="Reorder categories"
          >
            Reorder
          </Button>
        )}
      </div>
      {categories.map((entry) => (
        <CategoryRow
          key={entry.id}
          entry={entry}
          isRenaming={renamingId === entry.id}
          onDeleteRequest={onDeleteRequest}
          onRename={onRename}
          onRenameStart={onRenameStart}
          onRenameCancel={onRenameCancel}
          renameError={renamingId === entry.id ? renameError : null}
          pendingDeleteId={pendingDeleteId}
          pendingRenameId={pendingRenameId}
        />
      ))}
    </div>
  );
}
