/**
 * CategoryManagerList — renders ordered rows with name, itemCount, inline rename,
 * delete action, and reorder mode (Task 10).
 *
 * Reorder state is LIFTED to CategoryManager:
 *   - CategoryManager owns: isReordering, baselineEntries, baselineIds, draftIds,
 *     Save/Cancel handlers, dirty-close confirmation, back-handler registration.
 *   - CategoryManagerList receives reorder props and renders the move-button UI.
 *   - While reordering: Add form (in CategoryManager) and all rename/delete are disabled.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import type { ListCategoryManagementEntry } from "@/lib/types";
import { categoryNameSchema } from "@/lib/validations/lists";

const renameCategoryFormSchema = z.object({ name: categoryNameSchema });

// ---------------------------------------------------------------------------
// Reorder row — rendered when isReordering === true
// ---------------------------------------------------------------------------

interface ReorderRowProps {
  entry: ListCategoryManagementEntry;
  index: number;
  total: number;
  isPending: boolean;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  /** Ref target for focusing after move: "up" | "down" | null (boundary) */
  focusTarget: { id: string; direction: "up" | "down" } | null;
  onFocusHandled: () => void;
}

function ReorderRow({
  entry,
  index,
  total,
  isPending,
  onMoveUp,
  onMoveDown,
  focusTarget,
  onFocusHandled,
}: ReorderRowProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!focusTarget || focusTarget.id !== entry.id) return;
    const target =
      focusTarget.direction === "up" ? upRef.current : downRef.current;
    if (target) {
      target.focus();
    }
    onFocusHandled();
  }, [focusTarget, entry.id, onFocusHandled]);

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-3">
      {/* Move-up control */}
      <Button
        ref={upRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${entry.name} up`}
        disabled={isFirst || isPending}
        onClick={() => onMoveUp(entry.id)}
        className="min-h-11 min-w-11"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      {/* Move-down control */}
      <Button
        ref={downRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${entry.name} down`}
        disabled={isLast || isPending}
        onClick={() => onMoveDown(entry.id)}
        className="min-h-11 min-w-11"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>

      <div className="min-w-0 flex-1 pl-1">
        <p className="truncate font-medium text-foreground">{entry.name}</p>
        <p className="text-xs text-muted-foreground">
          {entry.itemCount === 1 ? "1 item" : `${entry.itemCount} items`}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Normal row (rename / delete) — rendered when not reordering
// ---------------------------------------------------------------------------

interface CategoryRowProps {
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
}

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
}: CategoryRowProps) {
  const isDeletePending = pendingDeleteId === entry.id;
  const isRenamePending = pendingRenameId === entry.id;

  const renameForm = useForm<{ name: string }>({
    resolver: zodResolver(renameCategoryFormSchema),
    defaultValues: { name: entry.name },
  });

  async function submitRename(values: { name: string }) {
    await onRename(entry, values.name);
  }

  if (isRenaming) {
    const renameErrorMessage =
      renameError ?? renameForm.formState.errors.name?.message;
    const renameErrorId = `rename-error-${entry.id}`;
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
        <form
          id={`rename-form-${entry.id}`}
          className="min-w-0 flex-1"
          onSubmit={renameForm.handleSubmit(submitRename)}
        >
          <Input
            aria-label="Rename category"
            autoComplete="off"
            aria-invalid={Boolean(renameErrorMessage)}
            aria-describedby={renameErrorMessage ? renameErrorId : undefined}
            {...renameForm.register("name")}
          />
          <FormError id={renameErrorId} message={renameErrorMessage} />
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

// ---------------------------------------------------------------------------
// CategoryManagerList props
// ---------------------------------------------------------------------------

export interface CategoryManagerListProps {
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
  /** ID of the category whose delete mutation is currently pending. */
  pendingDeleteId?: string | null;
  /** ID of the category whose rename mutation is currently pending. */
  pendingRenameId?: string | null;

  // -------------------------------------------------------------------------
  // Reorder props (Task 10) — lifted to CategoryManager
  // -------------------------------------------------------------------------

  /**
   * When true, the list renders in reorder mode (arrow buttons, no rename/delete).
   * The parent (CategoryManager) owns this state.
   */
  isReordering: boolean;
  /** Callback to enter reorder mode (parent sets its state). */
  onEnterReorder: () => void;

  /**
   * Snapshot of entries captured when reorder mode was entered.
   * Render rows from this snapshot so background refetches can't shift the
   * baseline mid-edit.
   */
  baselineEntries: ListCategoryManagementEntry[];

  /**
   * Current draft order of IDs (may differ from baselineIds after moves).
   */
  draftIds: string[];

  /** Update draft order: called by the list when an up/down move occurs. */
  onDraftIdsChange: (newIds: string[]) => void;

  /** Whether the reorder PUT is currently in flight. */
  reorderPending: boolean;
}

// ---------------------------------------------------------------------------
// CategoryManagerList
// ---------------------------------------------------------------------------

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
  isReordering,
  onEnterReorder,
  baselineEntries,
  draftIds,
  onDraftIdsChange,
  reorderPending,
}: CategoryManagerListProps) {
  // Live announcement for screen readers
  const [announcement, setAnnouncement] = useState("");

  // Focus management: which row + direction to focus after next render
  const [focusTarget, setFocusTarget] = useState<{
    id: string;
    direction: "up" | "down";
  } | null>(null);
  const handleFocusHandled = useCallback(() => setFocusTarget(null), []);

  // Build the current draft-ordered entries from the baseline snapshot
  const entryMap = useMemo(
    () => new Map(baselineEntries.map((e) => [e.id, e])),
    [baselineEntries],
  );
  const orderedEntries = useMemo(
    () =>
      draftIds
        .map((id) => entryMap.get(id))
        .filter((e): e is ListCategoryManagementEntry => Boolean(e)),
    [draftIds, entryMap],
  );

  function move(id: string, direction: "up" | "down") {
    const idx = draftIds.indexOf(id);
    if (idx === -1) return;

    const newIds = [...draftIds];
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= newIds.length) return;

    [newIds[idx], newIds[swapWith]] = [newIds[swapWith], newIds[idx]];
    onDraftIdsChange(newIds);

    // Determine new position for focus management
    const newIdx = swapWith;
    const newTotal = newIds.length;
    const isNowFirst = newIdx === 0;
    const isNowLast = newIdx === newTotal - 1;

    // If moving up and the row is now first, redirect focus to Down
    // If moving down and the row is now last, redirect focus to Up
    let focusDir: "up" | "down" = direction;
    if (direction === "up" && isNowFirst) {
      focusDir = "down";
    } else if (direction === "down" && isNowLast) {
      focusDir = "up";
    }

    setFocusTarget({ id, direction: focusDir });

    // Announce new position (1-based)
    const entry = entryMap.get(id);
    if (entry) {
      setAnnouncement(
        `${entry.name} moved to position ${newIdx + 1} of ${newTotal}`,
      );
    }
  }

  if (isReordering) {
    return (
      <div className="space-y-2">
        {/* aria-live region for screen reader announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>

        {orderedEntries.map((entry, index) => (
          <ReorderRow
            key={entry.id}
            entry={entry}
            index={index}
            total={orderedEntries.length}
            isPending={reorderPending}
            onMoveUp={(id) => move(id, "up")}
            onMoveDown={(id) => move(id, "down")}
            focusTarget={focusTarget}
            onFocusHandled={handleFocusHandled}
          />
        ))}
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
            onClick={onEnterReorder}
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
