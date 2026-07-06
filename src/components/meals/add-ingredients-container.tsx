import { useEffect, useMemo, useState } from "react";
import { useBulkCreateListItems, useCreateList, useLists } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BulkCreateListItemsRequest, MealBoard } from "@/lib/types";
import { bulkCreateListItemsSchema } from "@/lib/validations";
import { useAppStore } from "@/stores";
import { AddIngredientsSheet } from "./add-ingredients-sheet";

// Mirrors the shared schema's `.max(100)` cap so we can surface honest,
// cap-specific copy before firing the request (the BE enforces the same bound).
const MAX_BULK_ITEMS = 100;
const CAP_ERROR = `You can add up to ${MAX_BULK_ITEMS} items at once. Deselect some rows and try again.`;

interface AddIngredientsContainerProps {
  isOpen: boolean;
  board: MealBoard;
  onOpenChange: (open: boolean) => void;
}

/**
 * Task 6 orchestration container. Owns the grocery-list picker/create, the bulk
 * append mutation, and the success (View list) / failure state, and composes the
 * presentational {@link AddIngredientsSheet} via its `listPicker` / `onConfirm` /
 * `isSubmitting` seam. The sheet keeps its own review model (rows, edits,
 * selections); this container never reaches into it.
 *
 * Contract highlights:
 *   - Only grocery lists are offered (never to-do / general).
 *   - Exactly ONE `POST /lists/{id}/items/bulk` per confirmed action.
 *   - A failed append is never presented as success. On failure the sheet stays
 *     open with the reviewed selection intact and the action is retryable.
 *   - Create-then-fail: a just-created grocery list stays selected so a retry
 *     targets it without re-creating.
 */
export function AddIngredientsContainer({
  isOpen,
  board,
  onOpenChange,
}: AddIngredientsContainerProps) {
  const openListDetail = useAppStore((state) => state.openListDetail);
  const lists = useLists();

  const groceryLists = useMemo(
    () => (lists.data?.data ?? []).filter((list) => list.kind === "grocery"),
    [lists.data?.data],
  );

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  // The list a successful append landed in. Presence of this is the ONLY
  // success signal — set exclusively from the mutation's success path.
  const [appendedListId, setAppendedListId] = useState<string | null>(null);
  // Client-side guard failure (e.g. the >100-item cap) surfaced BEFORE any
  // request fires. Retained across renders until the user retries.
  const [validationError, setValidationError] = useState<string | null>(null);

  // Default to the only grocery list once lists resolve. Never override an
  // explicit user pick or a just-created list.
  useEffect(() => {
    if (selectedListId !== null) return;
    if (groceryLists.length === 1) {
      setSelectedListId(groceryLists[0].id);
    }
  }, [groceryLists, selectedListId]);

  // Reset transient orchestration state each time the sheet reopens so a prior
  // success/selection never leaks into a fresh review.
  useEffect(() => {
    if (isOpen) return;
    setSelectedListId(null);
    setNewListName("");
    setAppendedListId(null);
    setValidationError(null);
  }, [isOpen]);

  const createList = useCreateList({
    onSuccess: (response) => {
      // Keep the freshly created list selected so a retry (create-then-fail)
      // targets it without creating another list.
      setSelectedListId(response.data.id);
      setNewListName("");
    },
  });

  // Rules of Hooks: the mutation hook must run every render, so pass a stable
  // empty id when no target is chosen yet. `handleConfirm` guards against ever
  // firing without a real target.
  const targetListId = selectedListId ?? "";
  const bulkCreate = useBulkCreateListItems(targetListId);

  function handleConfirm(request: BulkCreateListItemsRequest) {
    // Never double-append: once an append has succeeded, ignore further clicks.
    if (appendedListId !== null) return;
    if (!selectedListId) return;
    if (request.items.length === 0) return;

    // Client-side guard with the SHARED schema (BE enforces the same bound):
    // reject before any network call so an over-cap payload never leaves the
    // client. The dominant real failure is the >100-item cap on a fully
    // recipe-planned week; give honest, actionable copy for it.
    const parsed = bulkCreateListItemsSchema.safeParse(request);
    if (!parsed.success) {
      setValidationError(
        request.items.length > MAX_BULK_ITEMS
          ? CAP_ERROR
          : "Some items couldn't be added. Check your rows and try again.",
      );
      return;
    }
    setValidationError(null);

    bulkCreate.mutate(request, {
      onSuccess: () => {
        setAppendedListId(selectedListId);
      },
    });
  }

  const isSubmitting = bulkCreate.isPending;

  const listPicker = (() => {
    if (appendedListId !== null) {
      return (
        <div
          className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3"
          role="status"
        >
          <p className="text-sm font-medium text-foreground">
            Ingredients added to your grocery list.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              openListDetail(appendedListId);
              onOpenChange(false);
            }}
          >
            View list
          </Button>
        </div>
      );
    }

    // The client-side guard failure takes precedence over a prior request
    // error — it's the reason nothing was sent this time.
    const errorMessage = validationError
      ? validationError
      : bulkCreate.isError
        ? bulkCreate.error instanceof Error
          ? bulkCreate.error.message
          : "Couldn't add ingredients to your list. Try again."
        : null;

    return (
      <div className="space-y-3">
        {errorMessage ? (
          <p
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        {groceryLists.length === 0 ? (
          <div className="space-y-2">
            <Label htmlFor="new-grocery-list-name">Grocery list name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="new-grocery-list-name"
                value={newListName}
                placeholder="e.g. Weekly groceries"
                autoComplete="off"
                onChange={(event) => setNewListName(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={
                  newListName.trim().length === 0 || createList.isPending
                }
                onClick={() =>
                  createList.mutate({
                    name: newListName.trim(),
                    kind: "grocery",
                  })
                }
              >
                Create grocery list
              </Button>
            </div>
            {createList.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {createList.error instanceof Error
                  ? createList.error.message
                  : "Couldn't create the list. Try again."}
              </p>
            ) : null}
          </div>
        ) : groceryLists.length === 1 ? (
          <p className="text-sm text-muted-foreground">
            Adding to{" "}
            <span className="font-medium">{groceryLists[0].name}</span>.
          </p>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="grocery-list-picker">Grocery list</Label>
            <select
              id="grocery-list-picker"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={selectedListId ?? ""}
              onChange={(event) =>
                setSelectedListId(event.target.value || null)
              }
            >
              <option value="" disabled>
                Choose a grocery list
              </option>
              {groceryLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  })();

  return (
    <AddIngredientsSheet
      isOpen={isOpen}
      board={board}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      isSubmitting={isSubmitting}
      // Block the confirm until a grocery list exists to target, and after a
      // successful append (the success panel's View list takes over).
      confirmDisabled={selectedListId === null || appendedListId !== null}
      listPicker={listPicker}
    />
  );
}
