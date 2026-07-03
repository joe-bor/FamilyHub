import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ApiException,
  listsKeys,
  listsService,
  useCreateListCategory,
  useCreateListItem,
  useUpdateListItem,
} from "@/api";
import { useOnlineStatus } from "@/hooks";
import type { ListDetail, ListItem } from "@/lib/types";
import type { ListItemFormData } from "@/lib/validations";
import { listItemSchema } from "@/lib/validations";
import { categoryNameSchema } from "@/lib/validations/lists";
import { Button } from "../ui/button";
import { FormError } from "../ui/form-error";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { MobileSheet } from "../ui/mobile-sheet";

interface ListItemSheetProps {
  open: boolean;
  mode: "create" | "edit";
  list: ListDetail;
  item: ListItem | null;
  onOpenChange: (open: boolean) => void;
}

const listItemFormId = "list-item-form";

export function ListItemSheet({
  open,
  mode,
  list,
  item,
  onOpenChange,
}: ListItemSheetProps) {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();

  const form = useForm<ListItemFormData>({
    resolver: zodResolver(listItemSchema),
    defaultValues: {
      text: item?.text ?? "",
      categoryId: item?.categoryId ?? null,
    },
  });
  const createItem = useCreateListItem(list.id);
  const updateItem = useUpdateListItem(list.id);
  const createCategory = useCreateListCategory();
  const categoryId = form.watch("categoryId") ?? "";

  // The category <select> renders straight from `list.categories`. The parent
  // (ListDetailView) sources `list` from useList(listId) — a plain query on
  // listsKeys.detail(id) — and useCreateListCategory.onSuccess writes the new
  // category into that cache for every same-kind detail. So after an inline
  // create the parent re-renders and this prop already contains the new
  // category; selecting it by id (below) renders the right option. We must NOT
  // also track it locally, or the merged list would double-list it (same id →
  // duplicate <option> + duplicate React key).

  // ---------------------------------------------------------------------------
  // Inline category creation state — lives OUTSIDE form.reset so a partial
  // category name typed mid-session survives a form re-render. It resets only
  // when a NEW item cycle begins (open transitions from false → true).
  // ---------------------------------------------------------------------------
  const [inlineOpen, setInlineOpen] = useState(false);
  const [inlineName, setInlineName] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlinePending, setInlinePending] = useState(false);
  const [hasCreatedItemThisCycle, setHasCreatedItemThisCycle] = useState(false);

  // Recovery error lives in React state so async updates trigger re-renders
  // properly in all environments (including test). form.setError alone may not
  // reliably re-render when called from a microtask outside React's sync event
  // dispatch.
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Track the previous value of `open` to detect new item cycles.
  const prevOpenRef = useRef(open);
  const prevModeRef = useRef(mode);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;
    if (!wasOpen && open) {
      // Fresh open cycle — collapse and clear the inline create field.
      setInlineOpen(false);
      setInlineName("");
      setInlineError(null);
      setRecoveryError(null);
      setHasCreatedItemThisCycle(false);
    }
  }, [open]);

  useEffect(() => {
    const previousMode = prevModeRef.current;
    prevModeRef.current = mode;
    if (open && previousMode !== mode) {
      setHasCreatedItemThisCycle(false);
    }
  }, [mode, open]);

  useEffect(() => {
    if (open) {
      form.reset({
        text: item?.text ?? "",
        categoryId: item?.categoryId ?? null,
      });
    }
  }, [form, item, open]);

  const isPending =
    createItem.isPending || updateItem.isPending || inlinePending;

  // ---------------------------------------------------------------------------
  // Inline category create handler
  // ---------------------------------------------------------------------------
  async function handleInlineCreate() {
    // Validate the inline name with categoryNameSchema before calling the API.
    const parseResult = categoryNameSchema.safeParse(inlineName);
    if (!parseResult.success) {
      setInlineError(parseResult.error.issues[0]?.message ?? "Invalid name");
      return;
    }

    setInlinePending(true);
    setInlineError(null);

    try {
      const response = await createCategory.mutateAsync({
        kind: list.kind,
        name: parseResult.data,
      });
      // useCreateListCategory.onSuccess has already written the new category
      // into the cached list detail, which flows back through the parent's
      // `list` prop. Selecting it by id renders the (now present) option.
      form.setValue("categoryId", response.data.id, { shouldDirty: true });
      setInlineName("");
      setInlineOpen(false);
      // A prior failed save may have left a recovery/save error showing. The
      // user has now successfully acted, so clear that stale message rather
      // than leaving it next to the resolved inline section.
      setRecoveryError(null);
    } catch (err) {
      const message = ApiException.isApiException(err)
        ? err.message
        : "Failed to create category";
      setInlineError(message);
      // Draft (text, current categoryId) is untouched because we never called
      // form.reset or form.setValue on any field other than categoryId on success.
    } finally {
      setInlinePending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // 404 recovery — async but stores result in React state to ensure re-render
  // ---------------------------------------------------------------------------
  async function run404Recovery(
    originalError: unknown,
    selectedCategoryId: string,
  ) {
    let refetched: ListDetail | null = null;
    try {
      const refetchedResponse = await listsService.getList(list.id);
      refetched = refetchedResponse.data;
      // Relies on the mutation-level onError (cache rollback to context.previous)
      // running BEFORE this per-call onError. If that ordering ever changes, this
      // authoritative detail write could be clobbered by the rollback.
      queryClient.setQueryData(listsKeys.detail(list.id), refetchedResponse);
    } catch (refetchError) {
      if (
        ApiException.isApiException(refetchError) &&
        refetchError.status === 404
      ) {
        // Branch 1: the list itself 404'd during recovery.
        setRecoveryError(
          "This list is no longer available. It may have been deleted.",
        );
        return;
      }

      const msg = ApiException.isApiException(originalError)
        ? originalError.message
        : "Failed to save item";
      setRecoveryError(msg);
      return;
    }

    // Branch 2 (edit mode only): item absent from refetched list.
    if (mode === "edit" && item) {
      const itemStillPresent = refetched.items.some((i) => i.id === item.id);
      if (!itemStillPresent) {
        setRecoveryError(
          "This item is no longer available. It may have been deleted.",
        );
        return;
      }
    }

    // Branch 3: selected category absent from the refetched (authoritative)
    // list categories.
    const categoryStillPresent = refetched.categories.some(
      (c) => c.id === selectedCategoryId,
    );
    if (!categoryStillPresent) {
      form.setValue("categoryId", null);
      setRecoveryError(
        "The selected category was removed. Please save again to continue without it.",
      );
      return;
    }

    // Branch 4: everything is still present — surface the original error.
    const msg = ApiException.isApiException(originalError)
      ? originalError.message
      : "Failed to save item";
    setRecoveryError(msg);
  }

  // ---------------------------------------------------------------------------
  // Item save
  // ---------------------------------------------------------------------------
  function submit(values: ListItemFormData) {
    const selectedCategoryId = values.categoryId ?? null;

    function handleItemError(error: unknown) {
      // Only attempt 404 recovery when: ApiException 404 + a category was selected.
      if (
        ApiException.isApiException(error) &&
        error.status === 404 &&
        selectedCategoryId !== null
      ) {
        void run404Recovery(error, selectedCategoryId);
        return;
      }

      // All other errors: surface immediately in recovery error state.
      const msg = ApiException.isApiException(error)
        ? error.message
        : "Failed to save item";
      setRecoveryError(msg);
    }

    // Clear any previous recovery error before a new save attempt.
    setRecoveryError(null);

    if (mode === "edit" && item) {
      updateItem.mutate(
        {
          itemId: item.id,
          request: {
            text: values.text,
            completed: item.completed,
            categoryId: values.categoryId ?? null,
          },
        },
        {
          onSuccess: () => onOpenChange(false),
          onError: handleItemError,
        },
      );
      return;
    }

    createItem.mutate(
      {
        text: values.text,
        categoryId: values.categoryId ?? null,
      },
      {
        onSuccess: () => {
          setHasCreatedItemThisCycle(true);
          form.reset({
            text: "",
            categoryId: selectedCategoryId,
          });
          window.setTimeout(() => form.setFocus("text"), 0);
        },
        onError: handleItemError,
      },
    );
  }

  return (
    <MobileSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      cancelLabel={
        mode === "create" && hasCreatedItemThisCycle ? "Done" : undefined
      }
      title={mode === "edit" ? "Edit Item" : "Add Item"}
      initialHeight="half"
      headerRight={
        <Button
          type="submit"
          form={listItemFormId}
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="px-1 text-primary hover:text-primary"
        >
          Save item
        </Button>
      }
    >
      <form
        id={listItemFormId}
        className="space-y-5"
        onSubmit={form.handleSubmit(submit)}
      >
        <div className="space-y-2">
          <Label htmlFor="item-text">Item text</Label>
          <Input id="item-text" autoComplete="off" {...form.register("text")} />
          <FormError message={form.formState.errors.text?.message} />
        </div>

        {/* Category selection — shown for ALL list kinds */}
        <div className="space-y-2">
          <Label htmlFor="item-category">Category</Label>
          <select
            id="item-category"
            value={categoryId}
            onChange={(event) =>
              form.setValue("categoryId", event.target.value || null)
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[15px] leading-5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Uncategorized</option>
            {list.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <FormError message={form.formState.errors.categoryId?.message} />
        </div>

        {/* Inline "New category" affordance */}
        {online ? (
          <div className="space-y-2">
            {!inlineOpen ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-0 text-primary hover:text-primary"
                onClick={() => {
                  setInlineOpen(true);
                  setInlineError(null);
                }}
                disabled={isPending}
              >
                + New category
              </Button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="inline-category-name">Category name</Label>
                <div className="flex gap-2">
                  <Input
                    id="inline-category-name"
                    autoComplete="off"
                    value={inlineName}
                    onChange={(e) => setInlineName(e.target.value)}
                    placeholder="Category name"
                    aria-describedby={
                      inlineError ? "inline-category-error" : undefined
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={inlinePending}
                    onClick={handleInlineCreate}
                  >
                    Create category
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={inlinePending}
                    onClick={() => {
                      setInlineOpen(false);
                      setInlineName("");
                      setInlineError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {inlineError && (
                  <FormError id="inline-category-error" message={inlineError} />
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Connect to the internet to add a new category.
          </p>
        )}

        {/* Recovery / save error messages */}
        {recoveryError && <FormError message={recoveryError} />}
      </form>
    </MobileSheet>
  );
}
