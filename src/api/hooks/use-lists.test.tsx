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
} from "vitest";
import type {
  ApiResponse,
  ListDetail,
  ListItem,
  ListPreferences,
} from "@/lib/types";
import {
  API_BASE,
  resetMockLists,
  seedMockListPreferences,
  seedMockLists,
  server,
} from "@/test/mocks/server";
import {
  listsKeys,
  useClearCompleted,
  useCreateList,
  useCreateListItem,
  useDeleteListItem,
  useList,
  useListPreferences,
  useLists,
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
      seeded: true,
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

  it("returns list details with seeded categories", async () => {
    seedMockLists([groceryList]);

    const { result } = renderHook(() => useList(groceryList.id), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.data.categories[0]).toMatchObject({
        name: "Produce",
        kind: "grocery",
        seeded: true,
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
});
