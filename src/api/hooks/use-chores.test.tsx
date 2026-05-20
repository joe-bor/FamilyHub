import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import type {
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
  useChoresBoard,
  useCompleteChoreForCurrentPeriod,
  useUncompleteChoreForCurrentPeriod,
  useUpdateChoreTemplate,
} from "./use-chores";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
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
