import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ApiResponse, Chore } from "@/lib/types";
import {
  getMockChores,
  seedMockChores,
  setupMswServer,
} from "@/test/mocks/server";
import { createTestQueryClient, seedFamilyStore } from "@/test/test-utils";
import {
  choreKeys,
  useChores,
  useCreateChore,
  useDeleteChore,
  useUpdateChore,
} from "./use-chores";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createOptimisticQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function createMockChore(overrides: Partial<Chore> = {}): Chore {
  return {
    id: overrides.id ?? "chore-1",
    title: overrides.title ?? "Take out trash",
    assignedToMemberId: overrides.assignedToMemberId ?? "member-1",
    dueDate: overrides.dueDate ?? "2026-05-05",
    completed: overrides.completed ?? false,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-05-05T09:00:00",
    updatedAt: overrides.updatedAt ?? "2026-05-05T09:00:00",
  };
}

describe("useChores hooks", () => {
  setupMswServer();

  beforeEach(() => {
    seedFamilyStore({
      id: "family-1",
      name: "Test Family",
      members: [{ id: "member-1", name: "Leo", color: "coral" }],
    });
  });

  it("returns chores from the released chores API", async () => {
    seedMockChores([
      createMockChore({
        id: "chore-1",
        title: "Take out trash",
        assignedToMemberId: "member-1",
      }),
    ]);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useChores(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data?.data).toEqual([
        expect.objectContaining({
          id: "chore-1",
          title: "Take out trash",
          assignedToMemberId: "member-1",
          dueDate: "2026-05-05",
          completed: false,
        }),
      ]);
    });
  });

  it("creates a chore with title, assignee, and optional due date", async () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useCreateChore(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({
      title: "Brush teeth",
      assignedToMemberId: "member-1",
      dueDate: null,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.data).toEqual(
      expect.objectContaining({
        title: "Brush teeth",
        assignedToMemberId: "member-1",
        dueDate: null,
        completed: false,
        completedAt: null,
      }),
    );
    expect(getMockChores()).toEqual([
      expect.objectContaining({
        title: "Brush teeth",
        assignedToMemberId: "member-1",
        dueDate: null,
      }),
    ]);
  });

  it("optimistically toggles a chore completion state", async () => {
    const chore = createMockChore({ id: "chore-toggle", completed: false });
    seedMockChores([chore]);
    const queryClient = createOptimisticQueryClient();
    queryClient.setQueryData<ApiResponse<Chore[]>>(choreKeys.list(), {
      data: [chore],
    });

    const { result } = renderHook(() => useUpdateChore(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({
      id: "chore-toggle",
      request: { completed: true },
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<Chore[]>>(choreKeys.list())?.data,
      ).toEqual([
        expect.objectContaining({
          id: "chore-toggle",
          completed: true,
        }),
      ]);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("optimistically removes a deleted chore", async () => {
    const keep = createMockChore({ id: "chore-keep", title: "Keep this" });
    const remove = createMockChore({
      id: "chore-delete",
      title: "Delete this",
    });
    seedMockChores([keep, remove]);
    const queryClient = createOptimisticQueryClient();
    queryClient.setQueryData<ApiResponse<Chore[]>>(choreKeys.list(), {
      data: [keep, remove],
    });

    const { result } = renderHook(() => useDeleteChore(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate("chore-delete");

    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<Chore[]>>(choreKeys.list())?.data,
      ).toEqual([expect.objectContaining({ id: "chore-keep" })]);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getMockChores()).toEqual([
      expect.objectContaining({ id: "chore-keep" }),
    ]);
  });
});
