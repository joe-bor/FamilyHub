import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import type {
  ApiResponse,
  ChoreBoardItem,
  ChoresBoard,
  UpdateChoreTemplateRequest,
  UpdateCurrentPeriodCompletionRequest,
} from "@/lib/types";
import {
  API_BASE,
  seedMockChoresBoard,
  server,
  setupMswServer,
} from "@/test/mocks/server";
import { createTestQueryClient, seedFamilyStore } from "@/test/test-utils";
import {
  choreKeys,
  useChoresBoard,
  useCompleteChoreForCurrentPeriod,
  useUncompleteChoreForCurrentPeriod,
  useUpdateChoreTemplate,
} from "./use-chores";

const STALE_PERIOD_MESSAGE = "Chore period is stale. Refresh and try again.";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createCacheQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function createBoardItem(
  overrides: Partial<ChoreBoardItem> & Pick<ChoreBoardItem, "templateId">,
): ChoreBoardItem {
  return {
    templateId: overrides.templateId,
    title: overrides.title ?? "Brush teeth",
    cadence: overrides.cadence ?? "DAILY",
    assignedToMemberId: overrides.assignedToMemberId ?? "member-1",
    completed: overrides.completed ?? false,
    completedAt: overrides.completedAt ?? null,
  };
}

function sampleChoresBoard(): ChoresBoard {
  return {
    timezone: "America/Los_Angeles",
    today: {
      scope: "TODAY",
      periodStartDate: "2026-05-17",
      periodEndDate: "2026-05-17",
      summary: { total: 1, completed: 0, remaining: 1 },
      assignees: [
        {
          member: { id: "member-1", name: "Leo", color: "coral" },
          summary: { total: 1, completed: 0, remaining: 1 },
          chores: [
            {
              templateId: "brush-teeth-id",
              title: "Brush teeth",
              cadence: "DAILY",
              assignedToMemberId: "member-1",
              completed: false,
              completedAt: null,
            },
          ],
        },
      ],
    },
    thisWeek: {
      scope: "THIS_WEEK",
      periodStartDate: "2026-05-17",
      periodEndDate: "2026-05-23",
      summary: { total: 0, completed: 0, remaining: 0 },
      assignees: [],
    },
    thisMonth: {
      scope: "THIS_MONTH",
      periodStartDate: "2026-05-01",
      periodEndDate: "2026-05-31",
      summary: { total: 0, completed: 0, remaining: 0 },
      assignees: [],
    },
  };
}

function sampleBoardWithTodayChores(chores: ChoreBoardItem[]): ChoresBoard {
  const completed = chores.filter((chore) => chore.completed).length;

  return {
    ...sampleChoresBoard(),
    today: {
      scope: "TODAY",
      periodStartDate: "2026-05-17",
      periodEndDate: "2026-05-17",
      summary: {
        total: chores.length,
        completed,
        remaining: chores.length - completed,
      },
      assignees: [
        {
          member: { id: "member-1", name: "Leo", color: "coral" },
          summary: {
            total: chores.length,
            completed,
            remaining: chores.length - completed,
          },
          chores,
        },
      ],
    },
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

  it("fetches the recurring chores board from the released board endpoint", async () => {
    seedMockChoresBoard(sampleChoresBoard());

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useChoresBoard(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data?.data.today).toMatchObject({
        scope: "TODAY",
        periodStartDate: "2026-05-17",
        summary: { total: 1, completed: 0, remaining: 1 },
      });
    });
    expect(result.current.data?.data.thisWeek.scope).toBe("THIS_WEEK");
    expect(result.current.data?.data.thisMonth.scope).toBe("THIS_MONTH");
  });

  it("sends stale-safe completion and uncompletion payloads", async () => {
    let capturedCompletionBody: UpdateCurrentPeriodCompletionRequest | null =
      null;
    let capturedUncompletionBody: UpdateCurrentPeriodCompletionRequest | null =
      null;
    const queryClient = createTestQueryClient();

    server.use(
      http.put(
        `${API_BASE}/chores/templates/brush-teeth-id/current-period-completion`,
        async ({ request }) => {
          capturedCompletionBody =
            (await request.json()) as UpdateCurrentPeriodCompletionRequest;
          return HttpResponse.json({
            data: {
              scope: "TODAY",
              periodStartDate: "2026-05-17",
              periodEndDate: "2026-05-17",
              item: {
                templateId: "brush-teeth-id",
                title: "Brush teeth",
                cadence: "DAILY",
                assignedToMemberId: "member-1",
                completed: true,
                completedAt: "2026-05-17T09:15:00Z",
              },
            },
          });
        },
      ),
      http.delete(
        `${API_BASE}/chores/templates/brush-teeth-id/current-period-completion`,
        async ({ request }) => {
          capturedUncompletionBody =
            (await request.json()) as UpdateCurrentPeriodCompletionRequest;
          return HttpResponse.json({
            data: {
              scope: "TODAY",
              periodStartDate: "2026-05-17",
              periodEndDate: "2026-05-17",
              item: {
                templateId: "brush-teeth-id",
                title: "Brush teeth",
                cadence: "DAILY",
                assignedToMemberId: "member-1",
                completed: false,
                completedAt: null,
              },
            },
          });
        },
      ),
    );

    const { result } = renderHook(
      () => ({
        complete: useCompleteChoreForCurrentPeriod(),
        uncomplete: useUncompleteChoreForCurrentPeriod(),
      }),
      { wrapper: createWrapper(queryClient) },
    );

    result.current.complete.mutate({
      templateId: "brush-teeth-id",
      request: {
        scope: "TODAY",
        periodStartDate: "2026-05-17",
      },
    });

    await waitFor(() => {
      expect(capturedCompletionBody).toEqual({
        scope: "TODAY",
        periodStartDate: "2026-05-17",
      });
    });

    result.current.uncomplete.mutate({
      templateId: "brush-teeth-id",
      request: {
        scope: "TODAY",
        periodStartDate: "2026-05-17",
      },
    });

    await waitFor(() => {
      expect(capturedUncompletionBody).toEqual({
        scope: "TODAY",
        periodStartDate: "2026-05-17",
      });
    });
  });

  it("moves a completed current-period routine below remaining routines in the board cache", async () => {
    const queryClient = createCacheQueryClient();
    const board = sampleBoardWithTodayChores([
      createBoardItem({ templateId: "first-id", title: "First routine" }),
      createBoardItem({ templateId: "second-id", title: "Second routine" }),
    ]);
    queryClient.setQueryData<ApiResponse<ChoresBoard>>(choreKeys.board(), {
      data: board,
    });

    server.use(
      http.put(
        `${API_BASE}/chores/templates/first-id/current-period-completion`,
        () =>
          HttpResponse.json({
            data: {
              scope: "TODAY",
              periodStartDate: "2026-05-17",
              periodEndDate: "2026-05-17",
              item: createBoardItem({
                templateId: "first-id",
                title: "First routine",
                completed: true,
                completedAt: "2026-05-17T09:15:00Z",
              }),
            },
          }),
      ),
    );

    const { result } = renderHook(() => useCompleteChoreForCurrentPeriod(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({
      templateId: "first-id",
      request: {
        scope: "TODAY",
        periodStartDate: "2026-05-17",
      },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(
      queryClient
        .getQueryData<ApiResponse<ChoresBoard>>(choreKeys.board())
        ?.data.today.assignees[0].chores.map((chore) => chore.templateId),
    ).toEqual(["second-id", "first-id"]);
  });

  it("moves an uncompleted current-period routine above completed routines in the board cache", async () => {
    const queryClient = createCacheQueryClient();
    const board = sampleBoardWithTodayChores([
      createBoardItem({
        templateId: "first-id",
        title: "First routine",
        completed: true,
        completedAt: "2026-05-17T09:15:00Z",
      }),
      createBoardItem({
        templateId: "second-id",
        title: "Second routine",
        completed: true,
        completedAt: "2026-05-17T09:20:00Z",
      }),
    ]);
    queryClient.setQueryData<ApiResponse<ChoresBoard>>(choreKeys.board(), {
      data: board,
    });

    server.use(
      http.delete(
        `${API_BASE}/chores/templates/second-id/current-period-completion`,
        () =>
          HttpResponse.json({
            data: {
              scope: "TODAY",
              periodStartDate: "2026-05-17",
              periodEndDate: "2026-05-17",
              item: createBoardItem({
                templateId: "second-id",
                title: "Second routine",
                completed: false,
              }),
            },
          }),
      ),
    );

    const { result } = renderHook(() => useUncompleteChoreForCurrentPeriod(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({
      templateId: "second-id",
      request: {
        scope: "TODAY",
        periodStartDate: "2026-05-17",
      },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(
      queryClient
        .getQueryData<ApiResponse<ChoresBoard>>(choreKeys.board())
        ?.data.today.assignees[0].chores.map((chore) => chore.templateId),
    ).toEqual(["second-id", "first-id"]);
  });

  it("refetches the board when completion fails because the current period is stale", async () => {
    let boardRequests = 0;
    const queryClient = createTestQueryClient();

    server.use(
      http.get(`${API_BASE}/chores/board`, () => {
        boardRequests += 1;
        return HttpResponse.json({ data: sampleChoresBoard() });
      }),
      http.put(
        `${API_BASE}/chores/templates/brush-teeth-id/current-period-completion`,
        () =>
          HttpResponse.json({ message: STALE_PERIOD_MESSAGE }, { status: 400 }),
      ),
    );

    const { result } = renderHook(
      () => ({
        board: useChoresBoard(),
        complete: useCompleteChoreForCurrentPeriod(),
      }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(result.current.board.isSuccess).toBe(true);
    });
    expect(boardRequests).toBe(1);

    result.current.complete.mutate({
      templateId: "brush-teeth-id",
      request: {
        scope: "TODAY",
        periodStartDate: "2026-05-17",
      },
    });

    await waitFor(() => {
      expect(result.current.complete.isError).toBe(true);
    });
    await waitFor(() => {
      expect(boardRequests).toBe(2);
    });
  });

  it("refetches the board when uncompletion fails because the current period is stale", async () => {
    let boardRequests = 0;
    const queryClient = createTestQueryClient();

    server.use(
      http.get(`${API_BASE}/chores/board`, () => {
        boardRequests += 1;
        return HttpResponse.json({ data: sampleChoresBoard() });
      }),
      http.delete(
        `${API_BASE}/chores/templates/brush-teeth-id/current-period-completion`,
        () =>
          HttpResponse.json({ message: STALE_PERIOD_MESSAGE }, { status: 400 }),
      ),
    );

    const { result } = renderHook(
      () => ({
        board: useChoresBoard(),
        uncomplete: useUncompleteChoreForCurrentPeriod(),
      }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(result.current.board.isSuccess).toBe(true);
    });
    expect(boardRequests).toBe(1);

    result.current.uncomplete.mutate({
      templateId: "brush-teeth-id",
      request: {
        scope: "TODAY",
        periodStartDate: "2026-05-17",
      },
    });

    await waitFor(() => {
      expect(result.current.uncomplete.isError).toBe(true);
    });
    await waitFor(() => {
      expect(boardRequests).toBe(2);
    });
  });

  it("sends archive updates for recurring templates", async () => {
    let capturedUpdateTemplateBody: UpdateChoreTemplateRequest | null = null;
    const queryClient = createTestQueryClient();

    server.use(
      http.patch(
        `${API_BASE}/chores/templates/brush-teeth-id`,
        async ({ request }) => {
          capturedUpdateTemplateBody =
            (await request.json()) as UpdateChoreTemplateRequest;
          return HttpResponse.json({
            data: {
              id: "brush-teeth-id",
              title: "Brush teeth",
              assignedToMemberId: "member-1",
              cadence: "DAILY",
              activeFrom: "2026-05-17",
              archived: true,
              createdAt: "2026-05-17T08:00:00Z",
              updatedAt: "2026-05-17T09:00:00Z",
            },
          });
        },
      ),
    );

    const { result } = renderHook(() => useUpdateChoreTemplate(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({
      id: "brush-teeth-id",
      request: { archived: true },
    });

    await waitFor(() => {
      expect(capturedUpdateTemplateBody).toEqual({ archived: true });
    });
  });
});
