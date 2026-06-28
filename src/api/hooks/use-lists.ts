import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listsService } from "@/api/services";
// Import from the specific module, not the "@/hooks" barrel: use-lists.ts is in
// the @/api graph that src/test/setup.ts preloads. Importing the barrel would
// eagerly load every hook (and its deps, e.g. @/components/ui/toaster) into the
// module registry during test setup, defeating vi.mock() of those modules in
// unrelated hook tests (the documented preload-vs-vi.mock gotcha).
import { useOnlineStatus } from "@/hooks/use-online-status";
import { assertOnlineForWrite } from "@/lib/offline/read-only-guard";
import type {
  CreateListCategoryRequest,
  CreateListItemRequest,
  CreateListRequest,
  ListCategoryCatalogApiResponse,
  ListCategoryManagementEntry,
  ListCategoryOption,
  ListDetail,
  ListDetailApiResponse,
  ListItem,
  ListKind,
  ListPreferencesApiResponse,
  RenameListCategoryRequest,
  ReorderListCategoriesRequest,
  UpdateListItemRequest,
  UpdateListPreferencesRequest,
  UpdateListRequest,
} from "@/lib/types";

export const listsKeys = {
  all: ["lists"] as const,
  hub: () => [...listsKeys.all, "hub"] as const,
  detail: (id: string) => [...listsKeys.all, "detail", id] as const,
  preferences: () => [...listsKeys.all, "preferences"] as const,
  categories: (kind: ListKind) =>
    [...listsKeys.all, "categories", kind] as const,
};

function updateDetailItems(
  previous: ListDetailApiResponse | undefined,
  update: (items: ListItem[]) => ListItem[],
): ListDetailApiResponse | undefined {
  if (!previous) return previous;
  return {
    ...previous,
    data: {
      ...previous.data,
      items: update(previous.data.items),
    },
  };
}

function replaceCreatedItem(
  items: ListItem[],
  temporaryId: string | undefined,
  createdItem: ListItem,
): ListItem[] {
  const next: ListItem[] = [];
  let inserted = false;

  for (const item of items) {
    if (item.id === temporaryId || item.id === createdItem.id) {
      if (!inserted) {
        next.push(createdItem);
        inserted = true;
      }
      continue;
    }

    next.push(item);
  }

  return inserted ? next : [...next, createdItem];
}

export function useLists() {
  return useQuery({
    queryKey: listsKeys.hub(),
    queryFn: listsService.getLists,
  });
}

export function useList(id: string | null) {
  return useQuery({
    queryKey: listsKeys.detail(id ?? "none"),
    queryFn: () => listsService.getList(id!),
    enabled: id !== null,
  });
}

export function useListPreferences() {
  return useQuery({
    queryKey: listsKeys.preferences(),
    queryFn: listsService.getPreferences,
  });
}

export function useCreateList(callbacks?: {
  onSuccess?: (data: ListDetailApiResponse) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateListRequest) =>
      listsService.createList(request),
    onSuccess: (response) => {
      queryClient.setQueryData(listsKeys.detail(response.data.id), response);
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
      callbacks?.onSuccess?.(response);
    },
  });
}

export function useUpdateList(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateListRequest) =>
      listsService.updateList(id, request),
    onMutate: async (request) => {
      // Read-only offline: reject before any optimistic cache change.
      assertOnlineForWrite();
      await queryClient.cancelQueries({ queryKey: listsKeys.detail(id) });
      const previous = queryClient.getQueryData<ListDetailApiResponse>(
        listsKeys.detail(id),
      );

      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(id),
        (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  categoryDisplayMode: request.categoryDisplayMode,
                  showCompletedOverride: request.showCompletedOverride,
                },
              }
            : current,
      );

      return { previous };
    },
    onError: (_error, _request, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listsKeys.detail(id), context.previous);
      }
    },
    onSuccess: (response) => {
      // The list-level PATCH never changes items, but its response carries the
      // server's item set at handling time — which can be stale if an item
      // mutation (create/update) was still in flight. Keep the cache's current
      // items and take the rest of the list fields from the response so a
      // concurrent item mutation is not clobbered.
      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(id),
        (current) =>
          current
            ? {
                ...response,
                data: { ...response.data, items: current.data.items },
              }
            : response,
      );
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
    },
  });
}

export function useCreateListItem(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateListItemRequest) =>
      listsService.createItem(listId, request),
    onMutate: async (request) => {
      // Read-only offline: reject before any optimistic cache change.
      assertOnlineForWrite();
      await queryClient.cancelQueries({ queryKey: listsKeys.detail(listId) });
      const previous = queryClient.getQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
      );
      const temporaryId = `optimistic-list-item-${crypto.randomUUID()}`;
      const optimisticItem: ListItem = {
        id: temporaryId,
        text: request.text.trim(),
        completed: false,
        completedAt: null,
        categoryId: request.categoryId ?? null,
        createdAt: "pending",
        updatedAt: "pending",
      };

      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (current) =>
          updateDetailItems(current, (items) => [...items, optimisticItem]),
      );

      return { previous, temporaryId };
    },
    onError: (_error, _request, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listsKeys.detail(listId), context.previous);
      }
    },
    onSuccess: (response, _request, context) => {
      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (previous) =>
          updateDetailItems(previous, (items) =>
            replaceCreatedItem(items, context?.temporaryId, response.data),
          ),
      );
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
    },
  });
}

export function useUpdateListItem(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      request,
    }: {
      itemId: string;
      request: UpdateListItemRequest;
    }) => listsService.updateItem(listId, itemId, request),
    onMutate: async ({ itemId, request }) => {
      // Read-only offline: reject before any optimistic cache change.
      assertOnlineForWrite();
      await queryClient.cancelQueries({ queryKey: listsKeys.detail(listId) });
      const previous = queryClient.getQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
      );

      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (current) =>
          updateDetailItems(current, (items) =>
            items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    text: request.text,
                    completed: request.completed,
                    completedAt: request.completed ? item.completedAt : null,
                    categoryId: request.categoryId ?? null,
                  }
                : item,
            ),
          ),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listsKeys.detail(listId), context.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (previous) =>
          updateDetailItems(previous, (items) =>
            items.map((item) =>
              item.id === response.data.id ? response.data : item,
            ),
          ),
      );
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
    },
  });
}

export function useDeleteListItem(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => listsService.deleteItem(listId, itemId),
    onMutate: async (itemId) => {
      // Read-only offline: reject before any optimistic cache change.
      assertOnlineForWrite();
      await queryClient.cancelQueries({ queryKey: listsKeys.detail(listId) });
      const previous = queryClient.getQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
      );

      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (current) =>
          updateDetailItems(current, (items) =>
            items.filter((item) => item.id !== itemId),
          ),
      );

      return { previous };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listsKeys.detail(listId), context.previous);
      }
    },
    onSuccess: (_data, itemId) => {
      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (previous) =>
          updateDetailItems(previous, (items) =>
            items.filter((item) => item.id !== itemId),
          ),
      );
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
    },
  });
}

export function useClearCompleted(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => listsService.clearCompleted(listId),
    onMutate: async () => {
      // Read-only offline: reject before any optimistic cache change.
      assertOnlineForWrite();
      await queryClient.cancelQueries({ queryKey: listsKeys.detail(listId) });
      const previous = queryClient.getQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
      );

      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (current) =>
          updateDetailItems(current, (items) =>
            items.filter((item) => !item.completed),
          ),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listsKeys.detail(listId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (previous) =>
          updateDetailItems(previous, (items) =>
            items.filter((item) => !item.completed),
          ),
      );
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
    },
  });
}

export function useUpdateListPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateListPreferencesRequest) =>
      listsService.updatePreferences(request),
    onMutate: async (request) => {
      // Read-only offline: reject before any optimistic cache change.
      assertOnlineForWrite();
      await queryClient.cancelQueries({ queryKey: listsKeys.preferences() });
      const previous = queryClient.getQueryData<ListPreferencesApiResponse>(
        listsKeys.preferences(),
      );

      queryClient.setQueryData<ListPreferencesApiResponse>(
        listsKeys.preferences(),
        { data: request },
      );

      return { previous };
    },
    onError: (_error, _request, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listsKeys.preferences(), context.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData(listsKeys.preferences(), response);
    },
  });
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

/**
 * Apply a transform to the categories array of every cached list-detail that
 * matches `kind`. Returns the updated set of query data entries.
 */
function updateSameKindDetailCategories(
  queryClient: ReturnType<typeof useQueryClient>,
  kind: ListKind,
  update: (categories: ListCategoryOption[]) => ListCategoryOption[],
): void {
  const queries = queryClient.getQueriesData<ListDetailApiResponse>({
    queryKey: listsKeys.all,
  });
  for (const [queryKey, data] of queries) {
    if (!data || queryKey[1] !== "detail" || data.data.kind !== kind) {
      continue;
    }
    queryClient.setQueryData<ListDetailApiResponse>(queryKey, {
      ...data,
      data: {
        ...data.data,
        categories: update(data.data.categories),
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Category hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the management catalog for a list kind.
 * Fetches only when the caller-supplied `enabled` flag is true AND the client
 * is online — the hook ANDs `enabled` with its own internal online status, so
 * the caller need only gate on intent (e.g. manager-open); the offline guard is
 * built in here. Never added to the offline persistence allowlist.
 */
export function useListCategories(kind: ListKind, enabled: boolean) {
  const online = useOnlineStatus();
  return useQuery({
    queryKey: listsKeys.categories(kind),
    queryFn: () => listsService.getCategories(kind),
    enabled: enabled && online,
  });
}

/**
 * Create a new category for a list kind.
 * On success:
 *   - Appends the returned ListCategoryOption to every cached same-kind list detail.
 *   - Appends the management entry to the cached catalog.
 *   - Invalidates same-kind detail queries as a correctness backstop.
 */
export function useCreateListCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateListCategoryRequest) => {
      assertOnlineForWrite();
      return listsService.createCategory(request);
    },
    onSuccess: (response, request) => {
      const { kind } = request;
      const entry: ListCategoryManagementEntry = response.data;
      const option: ListCategoryOption = {
        id: entry.id,
        kind: entry.kind,
        name: entry.name,
        sortOrder: entry.sortOrder,
      };

      // Append to every same-kind cached detail
      updateSameKindDetailCategories(queryClient, kind, (cats) => [
        ...cats,
        option,
      ]);

      // Append management entry to catalog
      queryClient.setQueryData<ListCategoryCatalogApiResponse>(
        listsKeys.categories(kind),
        (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  categories: [...current.data.categories, entry],
                },
              }
            : current,
      );

      // Invalidate same-kind detail queries as correctness backstop
      queryClient.invalidateQueries({
        queryKey: listsKeys.all,
        predicate: (q) =>
          q.queryKey[1] === "detail" &&
          queryClient.getQueryData<ListDetailApiResponse>(q.queryKey)?.data
            .kind === kind,
      });
    },
  });
}

/**
 * Rename an existing category.
 * On success:
 *   - Replaces matching entries in catalog and same-kind details.
 *   - Invalidates same-kind detail queries as a correctness backstop.
 */
export function useRenameListCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      name,
    }: {
      categoryId: string;
      name: string;
    }) => {
      assertOnlineForWrite();
      return listsService.renameCategory(categoryId, {
        name,
      } satisfies RenameListCategoryRequest);
    },
    onSuccess: (response, { categoryId }) => {
      const entry: ListCategoryManagementEntry = response.data;
      const { kind } = entry;

      // Update matching entries in all same-kind detail caches
      updateSameKindDetailCategories(queryClient, kind, (cats) =>
        cats.map((c) => (c.id === categoryId ? { ...c, name: entry.name } : c)),
      );

      // Update in catalog
      queryClient.setQueryData<ListCategoryCatalogApiResponse>(
        listsKeys.categories(kind),
        (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  categories: current.data.categories.map((c) =>
                    c.id === categoryId ? entry : c,
                  ),
                },
              }
            : current,
      );

      // Invalidate same-kind detail queries as correctness backstop
      queryClient.invalidateQueries({
        queryKey: listsKeys.all,
        predicate: (q) =>
          q.queryKey[1] === "detail" &&
          queryClient.getQueryData<ListDetailApiResponse>(q.queryKey)?.data
            .kind === kind,
      });
    },
  });
}

/**
 * Delete a category.
 * On success (immediate local update):
 *   - Remove category from catalog and same-kind details.
 *   - Null item `categoryId` for all items that referenced the deleted category.
 *   - Rewrite remaining `sortOrder` values to dense array indices.
 *   - Switch list to `flat` mode if no options remain.
 *   - Decrement `groupedListCount` by the authoritative `flattenedListCount`.
 *   - Invalidate/refetch the active management catalog (DELETE response doesn't carry compacted catalog).
 *   - Invalidate same-kind detail queries as correctness backstop.
 */
export function useDeleteListCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId }: { categoryId: string; kind: ListKind }) => {
      assertOnlineForWrite();
      return listsService.deleteCategory(categoryId);
    },
    onSuccess: (response, { categoryId, kind }) => {
      const { flattenedListCount } = response.data;

      // Update same-kind detail caches
      const queries = queryClient.getQueriesData<ListDetailApiResponse>({
        queryKey: listsKeys.all,
      });
      for (const [queryKey, data] of queries) {
        if (!data || queryKey[1] !== "detail" || data.data.kind !== kind) {
          continue;
        }
        const remaining = data.data.categories
          .filter((c) => c.id !== categoryId)
          .map((c, idx) => ({ ...c, sortOrder: idx }));

        const noOptionsLeft = remaining.length === 0;
        const updatedDetail: ListDetail = {
          ...data.data,
          categories: remaining,
          items: data.data.items.map((item) =>
            item.categoryId === categoryId
              ? { ...item, categoryId: null }
              : item,
          ),
          categoryDisplayMode:
            noOptionsLeft && data.data.categoryDisplayMode === "grouped"
              ? "flat"
              : data.data.categoryDisplayMode,
        };
        queryClient.setQueryData<ListDetailApiResponse>(queryKey, {
          ...data,
          data: updatedDetail,
        });
      }

      // Update catalog: remove category, compact sortOrder, decrement groupedListCount
      queryClient.setQueryData<ListCategoryCatalogApiResponse>(
        listsKeys.categories(kind),
        (current) => {
          if (!current) return current;
          const remaining = current.data.categories
            .filter((c) => c.id !== categoryId)
            .map((c, idx) => ({ ...c, sortOrder: idx }));
          return {
            ...current,
            data: {
              ...current.data,
              categories: remaining,
              groupedListCount: Math.max(
                0,
                current.data.groupedListCount - flattenedListCount,
              ),
            },
          };
        },
      );

      // Invalidate/refetch the management catalog (DELETE response doesn't carry compacted catalog)
      queryClient.invalidateQueries({
        queryKey: listsKeys.categories(kind),
        refetchType: "active",
      });

      // Invalidate same-kind detail queries as correctness backstop
      queryClient.invalidateQueries({
        queryKey: listsKeys.all,
        predicate: (q) =>
          q.queryKey[1] === "detail" &&
          queryClient.getQueryData<ListDetailApiResponse>(q.queryKey)?.data
            .kind === kind,
      });
    },
  });
}

/**
 * Reorder categories for a list kind.
 * On success:
 *   - Replace catalog with the server response.
 *   - Reorder same-kind detail categories from the catalog's canonical IDs.
 *   - Invalidate same-kind detail queries as correctness backstop.
 */
export function useReorderListCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ReorderListCategoriesRequest) => {
      assertOnlineForWrite();
      return listsService.reorderCategories(request);
    },
    onSuccess: (response, request) => {
      const { kind } = request;
      const catalog = response.data;

      // Replace catalog from response
      queryClient.setQueryData<ListCategoryCatalogApiResponse>(
        listsKeys.categories(kind),
        response,
      );

      // Build id → sortOrder map from the canonical catalog response
      const sortOrderMap = new Map(
        catalog.categories.map((c, idx) => [c.id, idx]),
      );

      // Reorder same-kind detail categories from the catalog's canonical order.
      // Any id absent from the reorder response sorts to the END (not the front)
      // so a stale/extra cached category never displaces a server-ordered one.
      updateSameKindDetailCategories(queryClient, kind, (cats) =>
        [...cats]
          .sort(
            (a, b) =>
              (sortOrderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
              (sortOrderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER),
          )
          .map((c, idx) => ({ ...c, sortOrder: idx })),
      );

      // Invalidate same-kind detail queries as correctness backstop
      queryClient.invalidateQueries({
        queryKey: listsKeys.all,
        predicate: (q) =>
          q.queryKey[1] === "detail" &&
          queryClient.getQueryData<ListDetailApiResponse>(q.queryKey)?.data
            .kind === kind,
      });
    },
  });
}
