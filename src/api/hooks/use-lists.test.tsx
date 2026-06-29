import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { listsService } from "@/api/services";
import type {
  ApiResponse,
  ListCategoryCatalog,
  ListDetail,
  ListItem,
  ListPreferences,
} from "@/lib/types";
import {
  API_BASE,
  resetMockLists,
  seedMockCategoryCatalog,
  seedMockListPreferences,
  seedMockLists,
  server,
} from "@/test/mocks/server";
import {
  listsKeys,
  useClearCompleted,
  useCreateList,
  useCreateListCategory,
  useCreateListItem,
  useDeleteListCategory,
  useDeleteListItem,
  useList,
  useListCategories,
  useListPreferences,
  useLists,
  useRenameListCategory,
  useReorderListCategories,
  useUpdateList,
  useUpdateListItem,
  useUpdateListPreferences,
} from "./use-lists";

const groceryList: ListDetail = {
  id: "00000000-0000-4000-8000-000000000101",
  name: "Trader Joe's Run",
  kind: "grocery",
  categoryDisplayMode: "grouped",
  showCompletedOverride: null,
  categories: [
    {
      id: "00000000-0000-4000-8000-000000000201",
      kind: "grocery",
      name: "Produce",
      sortOrder: 0,
    },
  ],
  items: [],
  createdAt: "2026-05-06T09:00:00",
  updatedAt: "2026-05-06T09:00:00",
};

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

describe("useLists", () => {
  let queryClient: QueryClient;

  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  }

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => {
    server.resetHandlers();
    resetMockLists();
    queryClient.clear();
  });
  afterAll(() => server.close());

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
  });

  it("returns hub summaries from the API", async () => {
    seedMockLists([groceryList]);

    const { result } = renderHook(() => useLists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.data[0]).toMatchObject({
        id: groceryList.id,
        name: "Trader Joe's Run",
        kind: "grocery",
        totalItems: 0,
        completedItems: 0,
      });
    });
  });

  it("returns list details with categories", async () => {
    seedMockLists([groceryList]);

    const { result } = renderHook(() => useList(groceryList.id), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.data.categories[0]).toMatchObject({
        name: "Produce",
        kind: "grocery",
        sortOrder: 0,
      });
    });
  });

  it("caches a created list detail and refreshes the hub", async () => {
    seedMockLists([]);

    const { result } = renderHook(() => useCreateList(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Target Run", kind: "grocery" });

    await waitFor(() => {
      expect(result.current.data?.data.name).toBe("Target Run");
    });

    const createdId = result.current.data?.data.id;
    expect(createdId).toBeDefined();
    expect(
      queryClient.getQueryData(listsKeys.detail(createdId!)),
    ).toMatchObject({
      data: {
        name: "Target Run",
        kind: "grocery",
        categoryDisplayMode: "grouped",
      },
    });
  });

  it("reads list preferences from the API", async () => {
    seedMockListPreferences({ showCompletedByDefault: false });

    const { result } = renderHook(() => useListPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.data.showCompletedByDefault).toBe(false);
    });
  });

  it("optimistically updates completed visibility preference", async () => {
    seedMockLists([]);
    seedMockListPreferences({ showCompletedByDefault: true });
    queryClient.setQueryData<ApiResponse<ListPreferences>>(
      listsKeys.preferences(),
      {
        data: { showCompletedByDefault: true },
      },
    );

    const { result } = renderHook(() => useUpdateListPreferences(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ showCompletedByDefault: false });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<ListPreferences>>(
          listsKeys.preferences(),
        )?.data.showCompletedByDefault,
      ).toBe(false);
    });
  });

  it("updates list display settings in the detail cache", async () => {
    seedMockLists([groceryList]);
    queryClient.setQueryData(listsKeys.detail(groceryList.id), {
      data: groceryList,
    } satisfies ApiResponse<ListDetail>);

    const { result } = renderHook(() => useUpdateList(groceryList.id), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      categoryDisplayMode: "flat",
      showCompletedOverride: false,
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<ListDetail>>(
          listsKeys.detail(groceryList.id),
        )?.data,
      ).toMatchObject({
        categoryDisplayMode: "flat",
        showCompletedOverride: false,
      });
    });
  });

  it("General list opts into grouped mode when its catalog is non-empty", async () => {
    const cat: import("@/lib/types").ListCategoryOption = {
      id: "00000000-0000-4000-8000-000000009010",
      kind: "general",
      name: "Documents",
      sortOrder: 0,
    };
    const generalList: ListDetail = {
      id: "00000000-0000-4000-8000-000000009011",
      name: "My General List",
      kind: "general",
      categoryDisplayMode: "flat",
      showCompletedOverride: null,
      categories: [cat],
      items: [],
      createdAt: "2026-06-22T09:00:00",
      updatedAt: "2026-06-22T09:00:00",
    };

    // Seed both the mock server state and the catalog so the handler allows grouped.
    seedMockLists([generalList]);
    seedMockCategoryCatalog("general", [cat]);
    queryClient.setQueryData(listsKeys.detail(generalList.id), {
      data: generalList,
    } satisfies ApiResponse<ListDetail>);

    const { result } = renderHook(() => useUpdateList(generalList.id), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      categoryDisplayMode: "grouped",
      showCompletedOverride: null,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(
        queryClient.getQueryData<ApiResponse<ListDetail>>(
          listsKeys.detail(generalList.id),
        )?.data.categoryDisplayMode,
      ).toBe("grouped");
    });
  });

  it("grouped PATCH returns 409 when the catalog is empty (general)", async () => {
    const generalList: ListDetail = {
      id: "00000000-0000-4000-8000-000000009012",
      name: "Empty General",
      kind: "general",
      categoryDisplayMode: "flat",
      showCompletedOverride: null,
      categories: [],
      items: [],
      createdAt: "2026-06-22T09:00:00",
      updatedAt: "2026-06-22T09:00:00",
    };

    seedMockLists([generalList]);
    // mockCategoryCatalogs["general"] starts empty by default after resetMockLists()
    queryClient.setQueryData(listsKeys.detail(generalList.id), {
      data: generalList,
    } satisfies ApiResponse<ListDetail>);

    const { result } = renderHook(() => useUpdateList(generalList.id), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      categoryDisplayMode: "grouped",
      showCompletedOverride: null,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    // The mutation must have failed (409 from the mock); cache must still be flat.
    expect(
      queryClient.getQueryData<ApiResponse<ListDetail>>(
        listsKeys.detail(generalList.id),
      )?.data.categoryDisplayMode,
    ).toBe("flat");
  });

  it("grouped PATCH returns 409 when catalog is empty for grocery (unified rule)", async () => {
    const emptyGrocery: ListDetail = {
      ...groceryList,
      id: "00000000-0000-4000-8000-000000009013",
      categoryDisplayMode: "flat",
      categories: [],
    };

    seedMockLists([emptyGrocery]);
    // Override the default grocery catalog to be empty.
    seedMockCategoryCatalog("grocery", []);
    queryClient.setQueryData(listsKeys.detail(emptyGrocery.id), {
      data: emptyGrocery,
    } satisfies ApiResponse<ListDetail>);

    const { result } = renderHook(() => useUpdateList(emptyGrocery.id), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      categoryDisplayMode: "grouped",
      showCompletedOverride: null,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(
      queryClient.getQueryData<ApiResponse<ListDetail>>(
        listsKeys.detail(emptyGrocery.id),
      )?.data.categoryDisplayMode,
    ).toBe("flat");
  });

  it("creates, updates, deletes, and clears list items in the detail cache", async () => {
    seedMockLists([groceryList]);
    queryClient.setQueryData(listsKeys.detail(groceryList.id), {
      data: groceryList,
    } satisfies ApiResponse<ListDetail>);

    const { result: createItem } = renderHook(
      () => useCreateListItem(groceryList.id),
      { wrapper: createWrapper() },
    );

    createItem.current.mutate({
      text: "Bananas",
      categoryId: groceryList.categories[0].id,
    });

    await waitFor(() => {
      expect(
        queryClient
          .getQueryData<ApiResponse<ListDetail>>(
            listsKeys.detail(groceryList.id),
          )
          ?.data.items.map((item) => item.text),
      ).toEqual(["Bananas"]);
    });

    const itemId =
      queryClient.getQueryData<ApiResponse<ListDetail>>(
        listsKeys.detail(groceryList.id),
      )?.data.items[0].id ?? "";

    const { result: updateItem } = renderHook(
      () => useUpdateListItem(groceryList.id),
      { wrapper: createWrapper() },
    );

    updateItem.current.mutate({
      itemId,
      request: {
        text: "Yellow bananas",
        completed: true,
        categoryId: groceryList.categories[0].id,
      },
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<ListDetail>>(
          listsKeys.detail(groceryList.id),
        )?.data.items[0],
      ).toMatchObject({ text: "Yellow bananas", completed: true });
    });

    const { result: clearCompleted } = renderHook(
      () => useClearCompleted(groceryList.id),
      { wrapper: createWrapper() },
    );

    clearCompleted.current.mutate();

    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<ListDetail>>(
          listsKeys.detail(groceryList.id),
        )?.data.items,
      ).toEqual([]);
    });

    const { result: createSecondItem } = renderHook(
      () => useCreateListItem(groceryList.id),
      { wrapper: createWrapper() },
    );
    createSecondItem.current.mutate({ text: "Spinach", categoryId: null });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<ListDetail>>(
          listsKeys.detail(groceryList.id),
        )?.data.items[0]?.text,
      ).toBe("Spinach");
    });

    const secondItemId =
      queryClient.getQueryData<ApiResponse<ListDetail>>(
        listsKeys.detail(groceryList.id),
      )?.data.items[0].id ?? "";

    const { result: deleteItem } = renderHook(
      () => useDeleteListItem(groceryList.id),
      { wrapper: createWrapper() },
    );

    deleteItem.current.mutate(secondItemId);

    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<ListDetail>>(
          listsKeys.detail(groceryList.id),
        )?.data.items,
      ).toEqual([]);
    });
  });

  it("optimistically inserts a created item and replaces it with the server item", async () => {
    seedMockLists([groceryList]);
    queryClient.setQueryData(listsKeys.detail(groceryList.id), {
      data: groceryList,
    } satisfies ApiResponse<ListDetail>);
    const createCanFinish = createDeferred();
    const serverItem: ListItem = {
      id: "00000000-0000-4000-8000-000000009001",
      text: "Milk",
      completed: false,
      completedAt: null,
      categoryId: null,
      createdAt: "2026-05-06T09:30:00",
      updatedAt: "2026-05-06T09:30:00",
    };
    server.use(
      http.post(`${API_BASE}/lists/:id/items`, async () => {
        await createCanFinish.promise;
        return HttpResponse.json(
          { data: serverItem, message: "List item created successfully" },
          { status: 201 },
        );
      }),
    );

    const { result } = renderHook(() => useCreateListItem(groceryList.id), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ text: "Milk", categoryId: null });

    await waitFor(() => {
      const items =
        queryClient.getQueryData<ApiResponse<ListDetail>>(
          listsKeys.detail(groceryList.id),
        )?.data.items ?? [];
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        text: "Milk",
        completed: false,
        categoryId: null,
      });
      expect(items[0].id).not.toBe(serverItem.id);
    });

    createCanFinish.resolve();

    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<ListDetail>>(
          listsKeys.detail(groceryList.id),
        )?.data.items,
      ).toEqual([serverItem]);
    });
  });

  it("preserves a created item when a concurrent list-setting PATCH resolves last", async () => {
    seedMockLists([groceryList]);
    queryClient.setQueryData(listsKeys.detail(groceryList.id), {
      data: groceryList,
    } satisfies ApiResponse<ListDetail>);

    const createCanFinish = createDeferred();
    const patchCanFinish = createDeferred();
    const serverItem: ListItem = {
      id: "00000000-0000-4000-8000-000000009002",
      text: "Milk",
      completed: false,
      completedAt: null,
      categoryId: null,
      createdAt: "2026-05-06T09:30:00",
      updatedAt: "2026-05-06T09:30:00",
    };

    server.use(
      // Hold the create response open so it is in flight when the PATCH fires.
      http.post(`${API_BASE}/lists/:id/items`, async () => {
        await createCanFinish.promise;
        return HttpResponse.json(
          { data: serverItem, message: "List item created successfully" },
          { status: 201 },
        );
      }),
      // The list-level PATCH returns a STALE detail (no items) — simulating the
      // server handling the setting change before the in-flight create landed.
      http.patch(`${API_BASE}/lists/:id`, async () => {
        await patchCanFinish.promise;
        return HttpResponse.json({
          data: {
            ...groceryList,
            categoryDisplayMode: "flat",
            showCompletedOverride: null,
            items: [],
          },
          message: "List updated successfully",
        } satisfies ApiResponse<ListDetail>);
      }),
    );

    const { result: createItem } = renderHook(
      () => useCreateListItem(groceryList.id),
      { wrapper: createWrapper() },
    );
    const { result: updateList } = renderHook(
      () => useUpdateList(groceryList.id),
      { wrapper: createWrapper() },
    );

    // 1) Start creating an item — the optimistic item enters the cache.
    createItem.current.mutate({ text: "Milk", categoryId: null });
    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<ListDetail>>(
          listsKeys.detail(groceryList.id),
        )?.data.items,
      ).toHaveLength(1);
    });

    // 2) While the create is still in flight, change a list-level setting.
    updateList.current.mutate({
      categoryDisplayMode: "flat",
      showCompletedOverride: null,
    });

    // 3) Let the create finish first: the real server item replaces the optimistic one.
    createCanFinish.resolve();
    await waitFor(() => {
      expect(createItem.current.isSuccess).toBe(true);
      expect(
        queryClient
          .getQueryData<ApiResponse<ListDetail>>(
            listsKeys.detail(groceryList.id),
          )
          ?.data.items.map((item) => item.id),
      ).toEqual([serverItem.id]);
    });

    // 4) Now the list-setting PATCH resolves last with its stale, item-less body.
    patchCanFinish.resolve();
    await waitFor(() => {
      expect(updateList.current.isSuccess).toBe(true);
    });

    // The PATCH only changes list-level settings; it must not drop the item.
    const detail = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(groceryList.id),
    );
    expect(detail?.data.categoryDisplayMode).toBe("flat");
    expect(detail?.data.items.map((item) => item.id)).toEqual([serverItem.id]);
  });

  it("rolls back an optimistic created item when the server rejects it", async () => {
    seedMockLists([groceryList]);
    queryClient.setQueryData(listsKeys.detail(groceryList.id), {
      data: groceryList,
    } satisfies ApiResponse<ListDetail>);
    const createCanFinish = createDeferred();
    server.use(
      http.post(`${API_BASE}/lists/:id/items`, async () => {
        await createCanFinish.promise;
        return HttpResponse.json({ message: "Server error" }, { status: 500 });
      }),
    );

    const { result } = renderHook(() => useCreateListItem(groceryList.id), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ text: "Milk", categoryId: null });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<ListDetail>>(
          listsKeys.detail(groceryList.id),
        )?.data.items,
      ).toHaveLength(1);
    });

    createCanFinish.resolve();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(
        queryClient.getQueryData<ApiResponse<ListDetail>>(
          listsKeys.detail(groceryList.id),
        )?.data.items,
      ).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Category query key
  // ---------------------------------------------------------------------------

  it("listsKeys.categories returns correct key shape", () => {
    expect(listsKeys.categories("grocery")).toEqual([
      "lists",
      "categories",
      "grocery",
    ]);
    expect(listsKeys.categories("to-do")).toEqual([
      "lists",
      "categories",
      "to-do",
    ]);
  });

  // ---------------------------------------------------------------------------
  // useListCategories
  // ---------------------------------------------------------------------------

  it("fetches catalog when enabled is true", async () => {
    const { result } = renderHook(() => useListCategories("grocery", true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data?.data.kind).toBe("grocery");
      expect(Array.isArray(result.current.data?.data.categories)).toBe(true);
    });
  });

  it("does not fetch catalog when enabled is false", () => {
    const { result } = renderHook(() => useListCategories("grocery", false), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // useCreateListCategory — appends to catalog and same-kind list details
  // ---------------------------------------------------------------------------

  it("create category appends to same-kind detail categories and to catalog", async () => {
    const groceryList2: ListDetail = {
      ...groceryList,
      id: "00000000-0000-4000-8000-000000000102",
      name: "Costco Run",
    };

    seedMockLists([groceryList, groceryList2]);
    queryClient.setQueryData(listsKeys.detail(groceryList.id), {
      data: groceryList,
    } satisfies ApiResponse<ListDetail>);
    queryClient.setQueryData(listsKeys.detail(groceryList2.id), {
      data: groceryList2,
    } satisfies ApiResponse<ListDetail>);

    const catalog: ListCategoryCatalog = {
      kind: "grocery",
      groupedListCount: 2,
      categories: [
        {
          id: "00000000-0000-4000-8000-000000000201",
          kind: "grocery",
          name: "Produce",
          sortOrder: 0,
          itemCount: 0,
        },
      ],
    };
    queryClient.setQueryData(listsKeys.categories("grocery"), {
      data: catalog,
    } satisfies ApiResponse<ListCategoryCatalog>);

    const { result } = renderHook(() => useCreateListCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ kind: "grocery", name: "Bakery" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // New category appears in both cached grocery list details
    const detail1 = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(groceryList.id),
    );
    const detail2 = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(groceryList2.id),
    );
    expect(detail1?.data.categories.some((c) => c.name === "Bakery")).toBe(
      true,
    );
    expect(detail2?.data.categories.some((c) => c.name === "Bakery")).toBe(
      true,
    );

    // New management entry appears in catalog
    const catalogData = queryClient.getQueryData<
      ApiResponse<ListCategoryCatalog>
    >(listsKeys.categories("grocery"));
    expect(catalogData?.data.categories.some((c) => c.name === "Bakery")).toBe(
      true,
    );
  });

  it("create category preserves the list's categoryDisplayMode (no auto-group)", async () => {
    // A flat list is the meaningful guard: a naive "auto-group on first
    // category" bug would flip this to "grouped". The contract is that
    // creating a category never mutates display mode.
    const flatGroceryList: ListDetail = {
      ...groceryList,
      id: "00000000-0000-4000-8000-000000000120",
      name: "Flat Pantry",
      categoryDisplayMode: "flat",
      categories: [],
    };

    seedMockLists([flatGroceryList]);
    queryClient.setQueryData(listsKeys.detail(flatGroceryList.id), {
      data: flatGroceryList,
    } satisfies ApiResponse<ListDetail>);

    const { result } = renderHook(() => useCreateListCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ kind: "grocery", name: "Bakery" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The category was added (proves the mutation actually ran on this list)...
    await waitFor(() => {
      const detail = queryClient.getQueryData<ApiResponse<ListDetail>>(
        listsKeys.detail(flatGroceryList.id),
      );
      expect(detail?.data.categories.some((c) => c.name === "Bakery")).toBe(
        true,
      );
    });

    // ...but the display mode is unchanged.
    const detail = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(flatGroceryList.id),
    );
    expect(detail?.data.categoryDisplayMode).toBe("flat");
  });

  it("create category does not touch a different kind's detail cache", async () => {
    const todoList: ListDetail = {
      id: "00000000-0000-4000-8000-000000000110",
      name: "My To-Dos",
      kind: "to-do",
      categoryDisplayMode: "grouped",
      showCompletedOverride: null,
      categories: [
        {
          id: "00000000-0000-4000-8000-000000000401",
          kind: "to-do",
          name: "Urgent",
          sortOrder: 0,
        },
      ],
      items: [],
      createdAt: "2026-05-06T09:00:00",
      updatedAt: "2026-05-06T09:00:00",
    };

    seedMockLists([groceryList, todoList]);
    queryClient.setQueryData(listsKeys.detail(todoList.id), {
      data: todoList,
    } satisfies ApiResponse<ListDetail>);

    const { result } = renderHook(() => useCreateListCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ kind: "grocery", name: "Bakery" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // To-do detail cache is unchanged
    const todoDetail = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(todoList.id),
    );
    expect(todoDetail?.data.categories).toHaveLength(1);
    expect(todoDetail?.data.categories[0].name).toBe("Urgent");
  });

  // ---------------------------------------------------------------------------
  // useRenameListCategory — updates catalog and same-kind detail categories
  // ---------------------------------------------------------------------------

  it("rename category updates matching entries in catalog and same-kind details", async () => {
    const catId = "00000000-0000-4000-8000-000000000201";
    const groceryList2: ListDetail = {
      ...groceryList,
      id: "00000000-0000-4000-8000-000000000102",
      name: "Costco Run",
      categories: [
        { id: catId, kind: "grocery", name: "Produce", sortOrder: 0 },
      ],
    };
    const groceryListWithCat: ListDetail = {
      ...groceryList,
      categories: [
        { id: catId, kind: "grocery", name: "Produce", sortOrder: 0 },
      ],
    };

    // Seed MSW catalog with specific IDs so PATCH endpoint can find it
    seedMockCategoryCatalog("grocery", [
      { id: catId, kind: "grocery", name: "Produce", sortOrder: 0 },
    ]);
    seedMockLists([groceryListWithCat, groceryList2]);
    queryClient.setQueryData(listsKeys.detail(groceryListWithCat.id), {
      data: groceryListWithCat,
    } satisfies ApiResponse<ListDetail>);
    queryClient.setQueryData(listsKeys.detail(groceryList2.id), {
      data: groceryList2,
    } satisfies ApiResponse<ListDetail>);

    const catalog: ListCategoryCatalog = {
      kind: "grocery",
      groupedListCount: 2,
      categories: [
        {
          id: catId,
          kind: "grocery",
          name: "Produce",
          sortOrder: 0,
          itemCount: 2,
        },
      ],
    };
    queryClient.setQueryData(listsKeys.categories("grocery"), {
      data: catalog,
    } satisfies ApiResponse<ListCategoryCatalog>);

    const { result } = renderHook(() => useRenameListCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ categoryId: catId, name: "Fresh Produce" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const detail1 = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(groceryListWithCat.id),
    );
    const detail2 = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(groceryList2.id),
    );
    expect(detail1?.data.categories[0].name).toBe("Fresh Produce");
    expect(detail2?.data.categories[0].name).toBe("Fresh Produce");

    const catalogData = queryClient.getQueryData<
      ApiResponse<ListCategoryCatalog>
    >(listsKeys.categories("grocery"));
    expect(catalogData?.data.categories[0].name).toBe("Fresh Produce");
  });

  // ---------------------------------------------------------------------------
  // useDeleteListCategory — removes category, nulls items, compacts sortOrder
  // ---------------------------------------------------------------------------

  it("delete middle category removes it, nulls items, compacts sortOrder across two details", async () => {
    const catA = "00000000-0000-4000-8000-000000000201";
    const catB = "00000000-0000-4000-8000-000000000202";
    const catC = "00000000-0000-4000-8000-000000000203";

    const listA: ListDetail = {
      id: "00000000-0000-4000-8000-000000000101",
      name: "List A",
      kind: "grocery",
      categoryDisplayMode: "grouped",
      showCompletedOverride: null,
      categories: [
        { id: catA, kind: "grocery", name: "Produce", sortOrder: 0 },
        { id: catB, kind: "grocery", name: "Dairy", sortOrder: 1 },
        { id: catC, kind: "grocery", name: "Frozen", sortOrder: 2 },
      ],
      items: [
        {
          id: "item-1",
          text: "Milk",
          completed: false,
          completedAt: null,
          categoryId: catB,
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
        {
          id: "item-2",
          text: "Cheese",
          completed: false,
          completedAt: null,
          categoryId: catB,
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
      ],
      createdAt: "2026-05-06T09:00:00",
      updatedAt: "2026-05-06T09:00:00",
    };
    const listB: ListDetail = {
      ...listA,
      id: "00000000-0000-4000-8000-000000000102",
      name: "List B",
      items: [
        {
          id: "item-3",
          text: "Ice cream",
          completed: false,
          completedAt: null,
          categoryId: catB,
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
      ],
    };

    // Seed MSW catalog so DELETE endpoint can find catB
    seedMockCategoryCatalog("grocery", [
      { id: catA, kind: "grocery", name: "Produce", sortOrder: 0 },
      { id: catB, kind: "grocery", name: "Dairy", sortOrder: 1 },
      { id: catC, kind: "grocery", name: "Frozen", sortOrder: 2 },
    ]);
    seedMockLists([listA, listB]);
    queryClient.setQueryData(listsKeys.detail(listA.id), {
      data: listA,
    } satisfies ApiResponse<ListDetail>);
    queryClient.setQueryData(listsKeys.detail(listB.id), {
      data: listB,
    } satisfies ApiResponse<ListDetail>);

    const catalog: ListCategoryCatalog = {
      kind: "grocery",
      groupedListCount: 2,
      categories: [
        {
          id: catA,
          kind: "grocery",
          name: "Produce",
          sortOrder: 0,
          itemCount: 0,
        },
        {
          id: catB,
          kind: "grocery",
          name: "Dairy",
          sortOrder: 1,
          itemCount: 3,
        },
        {
          id: catC,
          kind: "grocery",
          name: "Frozen",
          sortOrder: 2,
          itemCount: 0,
        },
      ],
    };
    queryClient.setQueryData(listsKeys.categories("grocery"), {
      data: catalog,
    } satisfies ApiResponse<ListCategoryCatalog>);

    const { result } = renderHook(() => useDeleteListCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ categoryId: catB, kind: "grocery" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Category removed from both details
    const d1 = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(listA.id),
    );
    const d2 = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(listB.id),
    );

    expect(d1?.data.categories.map((c) => c.name)).toEqual([
      "Produce",
      "Frozen",
    ]);
    expect(d2?.data.categories.map((c) => c.name)).toEqual([
      "Produce",
      "Frozen",
    ]);

    // sortOrder is dense (0, 1) after removal
    expect(d1?.data.categories.map((c) => c.sortOrder)).toEqual([0, 1]);
    expect(d2?.data.categories.map((c) => c.sortOrder)).toEqual([0, 1]);

    // Items that had catB get null categoryId
    expect(d1?.data.items.map((i) => i.categoryId)).toEqual([null, null]);
    expect(d2?.data.items.map((i) => i.categoryId)).toEqual([null]);

    // Catalog also loses catB
    const catalogData = queryClient.getQueryData<
      ApiResponse<ListCategoryCatalog>
    >(listsKeys.categories("grocery"));
    expect(catalogData?.data.categories.map((c) => c.name)).toEqual([
      "Produce",
      "Frozen",
    ]);
    expect(catalogData?.data.categories.map((c) => c.sortOrder)).toEqual([
      0, 1,
    ]);
  });

  it("delete last category switches grouped details to flat mode", async () => {
    const catId = "00000000-0000-4000-8000-000000000201";
    const listWithOneCategory: ListDetail = {
      ...groceryList,
      categories: [
        { id: catId, kind: "grocery", name: "Produce", sortOrder: 0 },
      ],
    };

    // Seed MSW catalog so DELETE endpoint can find catId
    seedMockCategoryCatalog("grocery", [
      { id: catId, kind: "grocery", name: "Produce", sortOrder: 0 },
    ]);
    seedMockLists([listWithOneCategory]);
    queryClient.setQueryData(listsKeys.detail(listWithOneCategory.id), {
      data: listWithOneCategory,
    } satisfies ApiResponse<ListDetail>);

    const catalog: ListCategoryCatalog = {
      kind: "grocery",
      groupedListCount: 1,
      categories: [
        {
          id: catId,
          kind: "grocery",
          name: "Produce",
          sortOrder: 0,
          itemCount: 0,
        },
      ],
    };
    queryClient.setQueryData(listsKeys.categories("grocery"), {
      data: catalog,
    } satisfies ApiResponse<ListCategoryCatalog>);

    const { result } = renderHook(() => useDeleteListCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ categoryId: catId, kind: "grocery" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const detail = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(listWithOneCategory.id),
    );
    // No categories remain → mode switches to flat
    expect(detail?.data.categories).toHaveLength(0);
    expect(detail?.data.categoryDisplayMode).toBe("flat");

    // Cache rule: groupedListCount drops by exactly the server's flattenedListCount.
    // The single grocery list was grouped, so the DELETE flattens it (count 1).
    const flattenedListCount = result.current.data?.data.flattenedListCount;
    expect(flattenedListCount).toBe(1);
    const catalogAfter = queryClient.getQueryData<
      ApiResponse<ListCategoryCatalog>
    >(listsKeys.categories("grocery"));
    // 1 (seeded) - 1 (flattened) = 0, floored at 0.
    expect(catalogAfter?.data.groupedListCount).toBe(0);
  });

  it("delete category does not touch a different kind's cached detail", async () => {
    const catId = "00000000-0000-4000-8000-000000000201";
    const todoList: ListDetail = {
      id: "00000000-0000-4000-8000-000000000110",
      name: "My To-Dos",
      kind: "to-do",
      categoryDisplayMode: "grouped",
      showCompletedOverride: null,
      categories: [
        {
          id: "00000000-0000-4000-8000-000000000401",
          kind: "to-do",
          name: "Urgent",
          sortOrder: 0,
        },
      ],
      items: [],
      createdAt: "2026-05-06T09:00:00",
      updatedAt: "2026-05-06T09:00:00",
    };

    // Seed MSW catalog so DELETE endpoint can find catId in grocery
    seedMockCategoryCatalog("grocery", [
      { id: catId, kind: "grocery", name: "Produce", sortOrder: 0 },
    ]);
    seedMockLists([groceryList, todoList]);
    queryClient.setQueryData(listsKeys.detail(todoList.id), {
      data: todoList,
    } satisfies ApiResponse<ListDetail>);

    const catalog: ListCategoryCatalog = {
      kind: "grocery",
      groupedListCount: 1,
      categories: [
        {
          id: catId,
          kind: "grocery",
          name: "Produce",
          sortOrder: 0,
          itemCount: 0,
        },
      ],
    };
    queryClient.setQueryData(listsKeys.categories("grocery"), {
      data: catalog,
    } satisfies ApiResponse<ListCategoryCatalog>);

    const { result } = renderHook(() => useDeleteListCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ categoryId: catId, kind: "grocery" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // To-do detail cache should be untouched
    const todoDetail = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(todoList.id),
    );
    expect(todoDetail?.data.categories).toHaveLength(1);
    expect(todoDetail?.data.categories[0].name).toBe("Urgent");
  });

  // ---------------------------------------------------------------------------
  // useReorderListCategories — replaces catalog and reorders same-kind details
  // ---------------------------------------------------------------------------

  it("reorder category updates catalog and same-kind detail category order", async () => {
    const catA = "00000000-0000-4000-8000-000000000201";
    const catB = "00000000-0000-4000-8000-000000000202";
    const catC = "00000000-0000-4000-8000-000000000203";

    const listWithCategories: ListDetail = {
      ...groceryList,
      categories: [
        { id: catA, kind: "grocery", name: "Produce", sortOrder: 0 },
        { id: catB, kind: "grocery", name: "Dairy", sortOrder: 1 },
        { id: catC, kind: "grocery", name: "Frozen", sortOrder: 2 },
      ],
    };

    // Seed MSW catalog so PUT /lists/categories/order can find and reorder these IDs
    seedMockCategoryCatalog("grocery", [
      { id: catA, kind: "grocery", name: "Produce", sortOrder: 0 },
      { id: catB, kind: "grocery", name: "Dairy", sortOrder: 1 },
      { id: catC, kind: "grocery", name: "Frozen", sortOrder: 2 },
    ]);
    seedMockLists([listWithCategories]);
    queryClient.setQueryData(listsKeys.detail(listWithCategories.id), {
      data: listWithCategories,
    } satisfies ApiResponse<ListDetail>);

    const catalog: ListCategoryCatalog = {
      kind: "grocery",
      groupedListCount: 1,
      categories: [
        {
          id: catA,
          kind: "grocery",
          name: "Produce",
          sortOrder: 0,
          itemCount: 0,
        },
        {
          id: catB,
          kind: "grocery",
          name: "Dairy",
          sortOrder: 1,
          itemCount: 0,
        },
        {
          id: catC,
          kind: "grocery",
          name: "Frozen",
          sortOrder: 2,
          itemCount: 0,
        },
      ],
    };
    queryClient.setQueryData(listsKeys.categories("grocery"), {
      data: catalog,
    } satisfies ApiResponse<ListCategoryCatalog>);

    const { result } = renderHook(() => useReorderListCategories(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      kind: "grocery",
      expectedCategoryIds: [catA, catB, catC],
      categoryIds: [catC, catA, catB],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Catalog reflects new order from server response
    const catalogData = queryClient.getQueryData<
      ApiResponse<ListCategoryCatalog>
    >(listsKeys.categories("grocery"));
    const catalogIds = catalogData?.data.categories.map((c) => c.id);
    expect(catalogIds).toEqual([catC, catA, catB]);

    // Detail categories are reordered to match catalog's canonical IDs
    const detail = queryClient.getQueryData<ApiResponse<ListDetail>>(
      listsKeys.detail(listWithCategories.id),
    );
    expect(detail?.data.categories.map((c) => c.id)).toEqual([
      catC,
      catA,
      catB,
    ]);
    expect(detail?.data.categories.map((c) => c.sortOrder)).toEqual([0, 1, 2]);
  });

  // ---------------------------------------------------------------------------
  // Offline write guard — category WRITE hooks must reject before mutating
  // the cache (no service call, cache untouched). Mirrors the item-mutation
  // offline-guard pattern in src/lib/offline/offline-read-only.test.tsx.
  // ---------------------------------------------------------------------------

  describe("offline write guard for category mutations", () => {
    const catId = "00000000-0000-4000-8000-000000000201";

    function setOnline(value: boolean): void {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value,
      });
    }

    // Seed one grocery detail + catalog so cache-untouched assertions are meaningful.
    function seedGroceryCategoryState() {
      const groceryWithCat: ListDetail = {
        ...groceryList,
        categories: [
          { id: catId, kind: "grocery", name: "Produce", sortOrder: 0 },
        ],
      };
      queryClient.setQueryData(listsKeys.detail(groceryWithCat.id), {
        data: groceryWithCat,
      } satisfies ApiResponse<ListDetail>);
      const catalog: ListCategoryCatalog = {
        kind: "grocery",
        groupedListCount: 1,
        categories: [
          {
            id: catId,
            kind: "grocery",
            name: "Produce",
            sortOrder: 0,
            itemCount: 0,
          },
        ],
      };
      queryClient.setQueryData(listsKeys.categories("grocery"), {
        data: catalog,
      } satisfies ApiResponse<ListCategoryCatalog>);
      return { groceryWithCat };
    }

    function expectGroceryStateUnchanged(detailId: string) {
      const detail = queryClient.getQueryData<ApiResponse<ListDetail>>(
        listsKeys.detail(detailId),
      );
      expect(detail?.data.categories).toHaveLength(1);
      expect(detail?.data.categories[0]).toMatchObject({
        id: catId,
        name: "Produce",
        sortOrder: 0,
      });
      const catalog = queryClient.getQueryData<
        ApiResponse<ListCategoryCatalog>
      >(listsKeys.categories("grocery"));
      expect(catalog?.data.categories).toHaveLength(1);
      expect(catalog?.data.groupedListCount).toBe(1);
    }

    beforeEach(() => setOnline(false));
    afterEach(() => {
      setOnline(true);
      vi.restoreAllMocks();
    });

    it("create rejects offline without calling the service or touching the cache", async () => {
      const { groceryWithCat } = seedGroceryCategoryState();
      const createSpy = vi.spyOn(listsService, "createCategory");

      const { result } = renderHook(() => useCreateListCategory(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ kind: "grocery", name: "Bakery" });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(createSpy).not.toHaveBeenCalled();
      expectGroceryStateUnchanged(groceryWithCat.id);
    });

    it("rename rejects offline without calling the service or touching the cache", async () => {
      const { groceryWithCat } = seedGroceryCategoryState();
      const renameSpy = vi.spyOn(listsService, "renameCategory");

      const { result } = renderHook(() => useRenameListCategory(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ categoryId: catId, name: "Fruit" });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(renameSpy).not.toHaveBeenCalled();
      expectGroceryStateUnchanged(groceryWithCat.id);
    });

    it("delete rejects offline without calling the service or touching the cache", async () => {
      const { groceryWithCat } = seedGroceryCategoryState();
      const deleteSpy = vi.spyOn(listsService, "deleteCategory");

      const { result } = renderHook(() => useDeleteListCategory(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ categoryId: catId, kind: "grocery" });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(deleteSpy).not.toHaveBeenCalled();
      expectGroceryStateUnchanged(groceryWithCat.id);
    });

    it("reorder rejects offline without calling the service or touching the cache", async () => {
      const { groceryWithCat } = seedGroceryCategoryState();
      const reorderSpy = vi.spyOn(listsService, "reorderCategories");

      const { result } = renderHook(() => useReorderListCategories(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        kind: "grocery",
        expectedCategoryIds: [catId],
        categoryIds: [catId],
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(reorderSpy).not.toHaveBeenCalled();
      expectGroceryStateUnchanged(groceryWithCat.id);
    });
  });
});
